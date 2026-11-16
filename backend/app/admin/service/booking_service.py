"""Bookings: creation, client cancellation, barber decisions, expiry.

Double-booking protection is layered:
1. the service only accepts a start time that ``availability_service`` offers;
2. PostgreSQL enforces it for real with the exclusion constraint
   ``ex_barber_booking_no_overlap`` (PENDING + CONFIRMED ranges, travel buffer
   included): two concurrent requests for the same slot cannot both commit,
   the loser gets a 409;
3. status transitions lock the booking row (SELECT ... FOR UPDATE), so a
   barber confirmation and a client cancellation cannot interleave.
"""
import secrets
from datetime import timedelta

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.admin.schema.barber import CreateBookingParam
from backend.app.admin.service import notification_service as notify
from backend.app.admin.service.availability_service import is_slot_available, now_utc
from backend.app.admin.service.barber_settings_service import get_settings
from backend.common.enums import BookingStatus as S
from backend.common.exception import errors
from backend.models.barber import BarberSettings, Booking, Service

_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # no 0/O/1/I


def _reference() -> str:
    return 'B' + ''.join(secrets.choice(_ALPHABET) for _ in range(7))


def can_client_cancel(b: Booking, cfg: BarberSettings) -> bool:
    if b.status == S.PENDING.value:
        return True
    if b.status == S.CONFIRMED.value:
        return now_utc() <= b.start_at - timedelta(hours=cfg.cancel_min_hours)
    return False


async def expire_overdue(db: AsyncSession) -> list[Booking]:
    """Cancel PENDING requests past their ``expires_at`` (frees their slots)."""
    now = now_utc()
    rows = (await db.execute(
        update(Booking)
        .where(Booking.status == S.PENDING.value, Booking.expires_at.is_not(None), Booking.expires_at <= now)
        .values(status=S.CANCELLED.value, cancelled_at=now, cancelled_by='system',
                status_reason='Demande expirée sans confirmation')
        .returning(Booking)
        .execution_options(synchronize_session=False)
    )).scalars().all()
    if rows:
        cfg = await get_settings(db)
        for b in rows:
            notify.enqueue_client(db, 'booking_expired', b, cfg)
    return list(rows)


async def create(db: AsyncSession, *, user, obj: CreateBookingParam) -> Booking:
    if not user.phone:
        raise errors.ForbiddenError(msg='Connectez-vous avec votre numéro WhatsApp pour réserver.')
    if not user.pseudo:
        raise errors.ForbiddenError(msg='Choisissez un pseudo avant de réserver.')
    service = await db.get(Service, obj.service_id)
    if service is None or not service.is_active:
        raise errors.NotFoundError(msg='Prestation introuvable.')
    cfg = await get_settings(db)
    if cfg.communes and obj.commune not in cfg.communes:
        raise errors.RequestError(msg='Commune non desservie.')

    # Free slots held by expired requests first, in this same transaction, so
    # the exclusion constraint never rejects a slot that is actually free.
    await expire_overdue(db)

    if not await is_slot_available(db, service, obj.start_at, cfg):
        raise errors.ConflictError(msg="Ce créneau n'est plus disponible. Choisissez-en un autre.")

    start = obj.start_at
    end = start + timedelta(minutes=service.duration_minutes)
    booking = Booking(
        reference=_reference(),
        user_id=user.id,
        service_id=service.id,
        service_name=service.name,
        price=service.price,
        duration_minutes=service.duration_minutes,
        start_at=start,
        end_at=end,
        blocked_until=end + timedelta(minutes=cfg.travel_buffer_minutes),
        customer_phone=user.phone,
        customer_pseudo=user.pseudo,
        commune=obj.commune,
        quartier=obj.quartier.strip(),
        address=obj.address.strip(),
        landmark=(obj.landmark or '').strip() or None,
        note=(obj.note or '').strip() or None,
        expires_at=now_utc() + timedelta(minutes=cfg.pending_expiry_minutes),
    )
    try:
        async with db.begin_nested():  # SAVEPOINT: turn the constraint into a clean 409
            db.add(booking)
            await db.flush()
    except IntegrityError as exc:
        if 'ex_barber_booking_no_overlap' in str(exc.orig):
            raise errors.ConflictError(msg="Ce créneau vient d'être réservé. Choisissez-en un autre.")
        raise
    notify.enqueue_client(db, 'booking_received', booking, cfg)
    notify.enqueue_barber(db, 'booking_new', booking, cfg)
    return booking


async def _locked(db: AsyncSession, **where) -> Booking:
    b = (await db.execute(select(Booking).filter_by(**where).with_for_update())).scalars().first()
    if b is None:
        raise errors.NotFoundError(msg='Rendez-vous introuvable.')
    return b


async def get_for_user(db: AsyncSession, *, user_id: int, reference: str) -> Booking:
    b = (await db.execute(
        select(Booking).where(Booking.reference == reference, Booking.user_id == user_id)
    )).scalars().first()
    if b is None:
        raise errors.NotFoundError(msg='Rendez-vous introuvable.')
    return b


async def cancel_by_client(db: AsyncSession, *, user_id: int, reference: str, reason: str | None) -> Booking:
    b = await _locked(db, reference=reference, user_id=user_id)
    cfg = await get_settings(db)
    if not can_client_cancel(b, cfg):
        if b.status == S.CONFIRMED.value:
            raise errors.ForbiddenError(
                msg=f"L'annulation n'est plus possible moins de {cfg.cancel_min_hours} h avant le rendez-vous. "
                    'Contactez directement le barbier.')
        raise errors.ForbiddenError(msg='Ce rendez-vous ne peut plus être annulé.')
    b.status = S.CANCELLED.value
    b.cancelled_at = now_utc()
    b.cancelled_by = 'client'
    b.status_reason = (reason or '').strip() or None
    b.expires_at = None
    await db.flush()
    notify.enqueue_barber(db, 'booking_cancelled_by_client', b, cfg)
    return b


# Barber decisions: allowed source statuses per action.
_TRANSITIONS = {
    'confirm': ((S.PENDING.value,), S.CONFIRMED.value, 'confirmed_at', 'booking_confirmed'),
    'reject': ((S.PENDING.value,), S.REJECTED.value, 'rejected_at', 'booking_rejected'),
    'cancel': ((S.PENDING.value, S.CONFIRMED.value), S.CANCELLED.value, 'cancelled_at', 'booking_cancelled'),
    'complete': ((S.CONFIRMED.value,), S.COMPLETED.value, 'completed_at', 'booking_completed'),
}


async def barber_action(db: AsyncSession, *, booking_id: int, action: str, reason: str | None) -> Booking:
    allowed, target, stamp, kind = _TRANSITIONS[action]
    b = await _locked(db, id=booking_id)
    now = now_utc()
    if b.status not in allowed:
        raise errors.ForbiddenError(msg=f'Action impossible : le rendez-vous est {b.status}.')
    if action == 'confirm' and b.expires_at is not None and b.expires_at <= now:
        raise errors.ForbiddenError(msg='Cette demande a expiré : le client doit refaire une demande.')
    if action == 'complete' and b.start_at > now:
        raise errors.ForbiddenError(msg="Le rendez-vous n'a pas encore commencé.")
    b.status = target
    setattr(b, stamp, now)
    b.expires_at = None
    if action in ('reject', 'cancel'):
        b.status_reason = (reason or '').strip() or None
    if action == 'cancel':
        b.cancelled_by = 'barber'
    await db.flush()
    notify.enqueue_client(db, kind, b, await get_settings(db))
    return b


async def stats(db: AsyncSession) -> dict:
    rows = (await db.execute(select(Booking.status, func.count()).group_by(Booking.status))).all()
    return {status: count for status, count in rows}
