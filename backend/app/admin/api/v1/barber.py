"""Client-facing BARBER API: catalogue, availability, bookings."""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi_limiter.depends import RateLimiter
from sqlalchemy import desc, select

from backend.app.admin.schema.barber import (
    AvailabilityOut,
    BookingOut,
    BreakOut,
    ScheduleOut,
    WorkingDayOut,
    CreateBookingParam,
    PublicProfileOut,
    ReasonParam,
    ServiceOut,
    SlotOut,
)
from backend.app.admin.service import booking_service
from backend.app.admin.service.availability_service import slots_for_day
from backend.app.admin.service.barber_settings_service import get_settings
from backend.common.exception import errors
from backend.common.response.response_schema import ResponseModel, response_base
from backend.common.security.jwt import DependsJwtAuth
from backend.database.db_postgres import CurrentSession, async_db_session
from backend.models.barber import Booking, BreakPeriod, Service, WorkingDay
from backend.utils.contact import call_url, whatsapp_url

router = APIRouter(prefix='/barber', tags=['Barber - client'])


def _booking_out(b: Booking, cfg) -> dict:
    data = BookingOut.model_validate(b).model_dump()
    data['can_cancel'] = booking_service.can_client_cancel(b, cfg)
    return data


@router.get('/services', summary='Active services with their prices')
async def list_services(request: Request, db: CurrentSession) -> ResponseModel:
    rows = (await db.execute(
        select(Service).where(Service.is_active.is_(True)).order_by(Service.sort_order, Service.id)
    )).scalars().all()
    return response_base.success(request=request, data=[ServiceOut.model_validate(s) for s in rows])


@router.get('/profile', summary="Barber's public profile and PERSONAL contact links")
async def public_profile(request: Request, db: CurrentSession) -> ResponseModel:
    cfg = await get_settings(db)
    data = PublicProfileOut(
        display_name=cfg.display_name,
        whatsapp_number=cfg.whatsapp_number,
        whatsapp_url=whatsapp_url(cfg.whatsapp_number, f'Bonjour {cfg.display_name}, '),
        call_number=cfg.call_number,
        call_url=call_url(cfg.call_number),
        communes=cfg.communes,
        cancel_min_hours=cfg.cancel_min_hours,
        pending_expiry_minutes=cfg.pending_expiry_minutes,
        horizon_days=cfg.horizon_days,
    )
    return response_base.success(request=request, data=data)


@router.get('/hours', summary='Weekly opening hours and breaks (public)')
async def opening_hours(request: Request, db: CurrentSession) -> ResponseModel:
    days = (await db.execute(select(WorkingDay).order_by(WorkingDay.weekday))).scalars().all()
    breaks = (await db.execute(select(BreakPeriod).order_by(BreakPeriod.weekday, BreakPeriod.start_time))).scalars().all()
    data = ScheduleOut(
        days=[WorkingDayOut.model_validate(d) for d in days], breaks=[BreakOut.model_validate(b) for b in breaks]
    )
    return response_base.success(request=request, data=data)


@router.get('/availability', summary='Free slots for a service on a given day')
async def availability(
    request: Request,
    db: CurrentSession,
    service_id: Annotated[int, Query()],
    day: Annotated[date, Query(alias='date')],
) -> ResponseModel:
    service = await db.get(Service, service_id)
    if service is None or not service.is_active:
        raise errors.NotFoundError(msg='Prestation introuvable.')
    cfg = await get_settings(db)
    slots = await slots_for_day(db, service, day, cfg)
    data = AvailabilityOut(
        date=day, service_id=service_id, slots=[SlotOut(start_at=s.start_at, end_at=s.end_at) for s in slots]
    )
    return response_base.success(request=request, data=data)


@router.post(
    '/bookings',
    summary='Request a booking (PENDING until the barber confirms it)',
    dependencies=[DependsJwtAuth, Depends(RateLimiter(times=10, minutes=10))],
)
async def create_booking(request: Request, obj: CreateBookingParam) -> ResponseModel:
    async with async_db_session.begin() as db:
        b = await booking_service.create(db, user=request.user, obj=obj)
        data = _booking_out(b, await get_settings(db))
    return response_base.success(request=request, data=data)


@router.get('/bookings', summary='My bookings', dependencies=[DependsJwtAuth])
async def my_bookings(request: Request, db: CurrentSession) -> ResponseModel:
    rows = (await db.execute(
        select(Booking).where(Booking.user_id == request.user.id).order_by(desc(Booking.start_at)).limit(100)
    )).scalars().all()
    cfg = await get_settings(db)
    return response_base.success(request=request, data=[_booking_out(b, cfg) for b in rows])


@router.get('/bookings/{reference}', summary='One of my bookings', dependencies=[DependsJwtAuth])
async def my_booking(request: Request, db: CurrentSession, reference: Annotated[str, Path(max_length=12)]) -> ResponseModel:
    b = await booking_service.get_for_user(db, user_id=request.user.id, reference=reference)
    return response_base.success(request=request, data=_booking_out(b, await get_settings(db)))


@router.post('/bookings/{reference}/cancel', summary='Cancel one of my bookings', dependencies=[DependsJwtAuth])
async def cancel_my_booking(
    request: Request, reference: Annotated[str, Path(max_length=12)], obj: ReasonParam | None = None
) -> ResponseModel:
    async with async_db_session.begin() as db:
        b = await booking_service.cancel_by_client(
            db, user_id=request.user.id, reference=reference, reason=obj.reason if obj else None
        )
        data = _booking_out(b, await get_settings(db))
    return response_base.success(request=request, data=data)
