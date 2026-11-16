"""Barber dashboard API (administrators only)."""
from datetime import date, datetime, time, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query, Request
from sqlalchemy import case, delete, desc, func, select

from backend.app.admin.schema.barber import (
    AdminBookingOut,
    BlockedOut,
    BlockedParam,
    BreakOut,
    ClientOut,
    NotificationOut,
    ReasonParam,
    ScheduleOut,
    ScheduleParam,
    ServiceOut,
    ServiceParam,
    SettingsOut,
    SettingsParam,
    WorkingDayOut,
)
from backend.app.admin.service import booking_service, notification_service
from backend.app.admin.service.availability_service import now_utc
from backend.app.admin.service.barber_settings_service import get_settings, update_settings
from backend.common.enums import BookingStatus
from backend.common.exception import errors
from backend.common.response.response_schema import ResponseModel, response_base
from backend.common.security.permissions import DependsAdmin
from backend.database.db_postgres import CurrentSession, async_db_session
from backend.models import User
from backend.models.barber import BlockedPeriod, Booking, BreakPeriod, Notification, Service, WorkingDay
from backend.utils.contact import call_url, whatsapp_url
from backend.utils.timezone import timezone

router = APIRouter(prefix='/barber-admin', tags=['Barber - dashboard'], dependencies=[DependsAdmin])


def _admin_booking(b: Booking) -> dict:
    data = AdminBookingOut.model_validate(b).model_dump()
    data['customer_whatsapp_url'] = whatsapp_url(b.customer_phone, f'Bonjour {b.customer_pseudo or ""}, ')
    data['customer_call_url'] = call_url(b.customer_phone)
    return data


# --------------------------------------------------------------------------- #
# Overview & bookings
# --------------------------------------------------------------------------- #

@router.get('/overview', summary="Today's appointments, pending requests and counters")
async def overview(request: Request, db: CurrentSession) -> ResponseModel:
    tz = timezone.tz_info
    today = now_utc().astimezone(tz).date()
    day_start = datetime.combine(today, time.min, tz)
    day_end = day_start + timedelta(days=1)
    today_rows = (await db.execute(
        select(Booking).where(
            Booking.start_at >= day_start, Booking.start_at < day_end,
            Booking.status.in_([BookingStatus.CONFIRMED.value, BookingStatus.COMPLETED.value]),
        ).order_by(Booking.start_at)
    )).scalars().all()
    pending = (await db.execute(
        select(Booking).where(Booking.status == BookingStatus.PENDING.value).order_by(Booking.start_at).limit(50)
    )).scalars().all()
    failed = (await db.execute(
        select(func.count()).select_from(Notification).where(Notification.status == 'failed')
    )).scalar_one()
    data = {
        'today': [_admin_booking(b) for b in today_rows],
        'pending': [_admin_booking(b) for b in pending],
        'counts': await booking_service.stats(db),
        'failed_notifications': failed,
    }
    return response_base.success(request=request, data=data)


@router.get('/bookings', summary='Bookings (filter by status and/or day)')
async def list_bookings(
    request: Request,
    db: CurrentSession,
    status: Annotated[str | None, Query()] = None,
    day: Annotated[date | None, Query(alias='date')] = None,
    q: Annotated[str | None, Query(max_length=60)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ResponseModel:
    stmt = select(Booking)
    if status:
        stmt = stmt.where(Booking.status == status.upper())
    if day:
        start = datetime.combine(day, time.min, timezone.tz_info)
        stmt = stmt.where(Booking.start_at >= start, Booking.start_at < start + timedelta(days=1))
    if q:
        like = f'%{q.strip()}%'
        stmt = stmt.where(
            Booking.reference.ilike(like) | Booking.customer_pseudo.ilike(like) | Booking.customer_phone.like(like)
            | Booking.quartier.ilike(like) | Booking.commune.ilike(like)
        )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    order = desc(Booking.start_at) if not status or status.upper() != 'PENDING' else Booking.start_at
    rows = (await db.execute(stmt.order_by(order).offset((page - 1) * size).limit(size))).scalars().all()
    data = {
        'items': [_admin_booking(b) for b in rows],
        'total': total, 'page': page, 'size': size, 'total_pages': max(1, -(-total // size)),
    }
    return response_base.success(request=request, data=data)


@router.get('/bookings/{pk}', summary='Booking detail')
async def get_booking(request: Request, db: CurrentSession, pk: Annotated[int, Path()]) -> ResponseModel:
    b = await db.get(Booking, pk)
    if b is None:
        raise errors.NotFoundError(msg='Rendez-vous introuvable.')
    return response_base.success(request=request, data=_admin_booking(b))


@router.post('/bookings/{pk}/{action}', summary='confirm | reject | cancel | complete')
async def booking_action(
    request: Request,
    pk: Annotated[int, Path()],
    action: Annotated[Literal['confirm', 'reject', 'cancel', 'complete'], Path()],
    obj: ReasonParam | None = None,
) -> ResponseModel:
    async with async_db_session.begin() as db:
        b = await booking_service.barber_action(db, booking_id=pk, action=action, reason=obj.reason if obj else None)
        data = _admin_booking(b)
    return response_base.success(request=request, data=data)


# --------------------------------------------------------------------------- #
# Clients
# --------------------------------------------------------------------------- #

@router.get('/clients', summary='Clients with their booking history summary')
async def list_clients(
    request: Request,
    db: CurrentSession,
    q: Annotated[str | None, Query(max_length=60)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ResponseModel:
    agg = (
        select(
            Booking.user_id.label('uid'),
            func.count().label('total'),
            func.sum(case((Booking.status == BookingStatus.COMPLETED.value, 1), else_=0)).label('completed'),
            func.max(Booking.start_at).label('last_at'),
        ).group_by(Booking.user_id).subquery()
    )
    stmt = select(User, agg.c.total, agg.c.completed, agg.c.last_at).join(agg, agg.c.uid == User.id)
    if q:
        like = f'%{q.strip()}%'
        stmt = stmt.where(User.pseudo.ilike(like) | User.phone.like(like))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(desc(agg.c.last_at)).offset((page - 1) * size).limit(size))).all()
    items = []
    for user, n_total, n_completed, last_at in rows:
        last = (await db.execute(
            select(Booking).where(Booking.user_id == user.id).order_by(desc(Booking.start_at)).limit(1)
        )).scalars().first()
        items.append(ClientOut(
            id=user.id, pseudo=user.pseudo, phone=user.phone,
            whatsapp_url=whatsapp_url(user.phone), call_url=call_url(user.phone),
            join_time=user.join_time, bookings_total=n_total or 0, bookings_completed=n_completed or 0,
            last_booking_at=last_at,
            last_commune=last.commune if last else None, last_quartier=last.quartier if last else None,
            last_address=last.address if last else None,
        ))
    data = {'items': items, 'total': total, 'page': page, 'size': size, 'total_pages': max(1, -(-total // size))}
    return response_base.success(request=request, data=data)


# --------------------------------------------------------------------------- #
# Services (prestations & tarifs)
# --------------------------------------------------------------------------- #

@router.get('/services', summary='All services (active or not)')
async def admin_services(request: Request, db: CurrentSession) -> ResponseModel:
    rows = (await db.execute(select(Service).order_by(Service.sort_order, Service.id))).scalars().all()
    return response_base.success(request=request, data=[ServiceOut.model_validate(s) for s in rows])


@router.post('/services', summary='Create a service')
async def create_service(request: Request, obj: ServiceParam) -> ResponseModel:
    async with async_db_session.begin() as db:
        s = Service(**obj.model_dump())
        db.add(s)
        await db.flush()
        data = ServiceOut.model_validate(s)
    return response_base.success(request=request, data=data)


@router.put('/services/{pk}', summary='Update a service (price, duration...)')
async def update_service(request: Request, pk: Annotated[int, Path()], obj: ServiceParam) -> ResponseModel:
    async with async_db_session.begin() as db:
        s = await db.get(Service, pk)
        if s is None:
            raise errors.NotFoundError(msg='Prestation introuvable.')
        for k, v in obj.model_dump().items():
            setattr(s, k, v)
        await db.flush()
        data = ServiceOut.model_validate(s)
    return response_base.success(request=request, data=data)


@router.delete('/services/{pk}', summary='Delete a service (or deactivate it if it has bookings)')
async def delete_service(request: Request, pk: Annotated[int, Path()]) -> ResponseModel:
    async with async_db_session.begin() as db:
        s = await db.get(Service, pk)
        if s is None:
            raise errors.NotFoundError(msg='Prestation introuvable.')
        used = (await db.execute(select(func.count()).select_from(Booking).where(Booking.service_id == pk))).scalar_one()
        if used:
            s.is_active = False  # keep history readable
        else:
            await db.delete(s)
    return response_base.success(request=request)


# --------------------------------------------------------------------------- #
# Settings (personal numbers & rules)
# --------------------------------------------------------------------------- #

@router.get('/settings', summary='Barber settings')
async def read_settings(request: Request, db: CurrentSession) -> ResponseModel:
    return response_base.success(request=request, data=SettingsOut.model_validate(await get_settings(db)))


@router.put('/settings', summary='Update settings (personal WhatsApp / call numbers, rules, communes)')
async def write_settings(request: Request, obj: SettingsParam) -> ResponseModel:
    async with async_db_session.begin() as db:
        data = SettingsOut.model_validate(await update_settings(db, obj))
    return response_base.success(request=request, data=data)


# --------------------------------------------------------------------------- #
# Schedule (working hours, breaks) & blocked dates
# --------------------------------------------------------------------------- #

async def _schedule(db) -> ScheduleOut:
    days = (await db.execute(select(WorkingDay).order_by(WorkingDay.weekday))).scalars().all()
    breaks = (await db.execute(select(BreakPeriod).order_by(BreakPeriod.weekday, BreakPeriod.start_time))).scalars().all()
    return ScheduleOut(
        days=[WorkingDayOut.model_validate(d) for d in days], breaks=[BreakOut.model_validate(b) for b in breaks]
    )


@router.get('/schedule', summary='Weekly working hours and breaks')
async def read_schedule(request: Request, db: CurrentSession) -> ResponseModel:
    return response_base.success(request=request, data=await _schedule(db))


@router.put('/schedule', summary='Replace weekly working hours and breaks')
async def write_schedule(request: Request, obj: ScheduleParam) -> ResponseModel:
    for br in obj.breaks:
        day = next(d for d in obj.days if d.weekday == br.weekday)
        if br.start_time < day.start_time or br.end_time > day.end_time:
            raise errors.RequestError(msg='Une pause doit être comprise dans les horaires du jour.')
    async with async_db_session.begin() as db:
        existing = {d.weekday: d for d in (await db.execute(select(WorkingDay))).scalars().all()}
        for d in obj.days:
            row = existing.get(d.weekday)
            if row is None:
                db.add(WorkingDay(**d.model_dump()))
            else:
                for k, v in d.model_dump().items():
                    setattr(row, k, v)
        await db.execute(delete(BreakPeriod))
        for br in obj.breaks:
            db.add(BreakPeriod(**br.model_dump()))
        await db.flush()
        data = await _schedule(db)
    return response_base.success(request=request, data=data)


@router.get('/blocked', summary='Upcoming blocked periods')
async def list_blocked(request: Request, db: CurrentSession) -> ResponseModel:
    rows = (await db.execute(
        select(BlockedPeriod).where(BlockedPeriod.end_at > now_utc()).order_by(BlockedPeriod.start_at)
    )).scalars().all()
    return response_base.success(request=request, data=[BlockedOut.model_validate(b) for b in rows])


@router.post('/blocked', summary='Block a period (day off, holiday...)')
async def create_blocked(request: Request, obj: BlockedParam) -> ResponseModel:
    async with async_db_session.begin() as db:
        b = BlockedPeriod(**obj.model_dump())
        db.add(b)
        await db.flush()
        conflicts = (await db.execute(
            select(func.count()).select_from(Booking).where(
                Booking.status == BookingStatus.CONFIRMED.value,
                Booking.start_at < obj.end_at, Booking.end_at > obj.start_at,
            )
        )).scalar_one()
        data = {**BlockedOut.model_validate(b).model_dump(), 'confirmed_bookings_in_period': conflicts}
    return response_base.success(request=request, data=data)


@router.delete('/blocked/{pk}', summary='Remove a blocked period')
async def delete_blocked(request: Request, pk: Annotated[int, Path()]) -> ResponseModel:
    async with async_db_session.begin() as db:
        b = await db.get(BlockedPeriod, pk)
        if b is None:
            raise errors.NotFoundError(msg='Période introuvable.')
        await db.delete(b)
    return response_base.success(request=request)


# --------------------------------------------------------------------------- #
# Notifications (GOWA outbox)
# --------------------------------------------------------------------------- #

@router.get('/notifications', summary='WhatsApp notifications (filter by status)')
async def list_notifications(
    request: Request,
    db: CurrentSession,
    status: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ResponseModel:
    stmt = select(Notification)
    if status:
        stmt = stmt.where(Notification.status == status)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(desc(Notification.id)).offset((page - 1) * size).limit(size))).scalars().all()
    data = {
        'items': [NotificationOut.model_validate(n) for n in rows],
        'total': total, 'page': page, 'size': size, 'total_pages': max(1, -(-total // size)),
    }
    return response_base.success(request=request, data=data)


@router.post('/notifications/{pk}/retry', summary='Send a failed notification again')
async def retry_notification(request: Request, pk: Annotated[int, Path()]) -> ResponseModel:
    async with async_db_session.begin() as db:
        n = await notification_service.retry(db, pk)
        data = NotificationOut.model_validate(n)
    return response_base.success(request=request, data=data)
