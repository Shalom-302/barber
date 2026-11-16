"""Free slots computation.

A slot ``[start, start + duration)`` is offered when:
- the weekday is open and the slot fits in the opening hours;
- it overlaps no pause and no blocked period;
- ``[start, start + duration + travel buffer)`` overlaps no active booking
  (CONFIRMED, or PENDING not yet expired) - the same rule PostgreSQL enforces
  with the exclusion constraint;
- it starts at least ``min_lead_minutes`` from now and within ``horizon_days``.
"""
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone as dt_timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.enums import BookingStatus
from backend.models.barber import BarberSettings, BlockedPeriod, Booking, BreakPeriod, Service, WorkingDay
from backend.utils.timezone import timezone


@dataclass(frozen=True)
class Slot:
    start_at: datetime
    end_at: datetime


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


def now_utc() -> datetime:
    return datetime.now(dt_timezone.utc)


def active_booking_filter(now: datetime):
    """SQL filter for bookings that hold a slot right now."""
    return or_(
        Booking.status == BookingStatus.CONFIRMED.value,
        and_(
            Booking.status == BookingStatus.PENDING.value,
            or_(Booking.expires_at.is_(None), Booking.expires_at > now),
        ),
    )


async def slots_for_day(
    db: AsyncSession, service: Service, day: date, cfg: BarberSettings, *, exclude_booking_id: int | None = None
) -> list[Slot]:
    tz = timezone.tz_info
    now = now_utc()
    today_local = now.astimezone(tz).date()
    if day < today_local or day > today_local + timedelta(days=cfg.horizon_days):
        return []

    wd = (await db.execute(select(WorkingDay).where(WorkingDay.weekday == day.weekday()))).scalars().first()
    if wd is None or not wd.is_open:
        return []

    day_open = datetime.combine(day, wd.start_time, tz)
    day_close = datetime.combine(day, wd.end_time, tz)
    breaks = (
        await db.execute(select(BreakPeriod).where(BreakPeriod.weekday == day.weekday()))
    ).scalars().all()
    pauses = [(datetime.combine(day, b.start_time, tz), datetime.combine(day, b.end_time, tz)) for b in breaks]

    window_start = day_open - timedelta(hours=12)
    window_end = day_close + timedelta(hours=12)
    blocked = (
        await db.execute(
            select(BlockedPeriod).where(BlockedPeriod.start_at < window_end, BlockedPeriod.end_at > window_start)
        )
    ).scalars().all()
    stmt = select(Booking).where(
        active_booking_filter(now), Booking.start_at < window_end, Booking.blocked_until > window_start
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)
    bookings = (await db.execute(stmt)).scalars().all()

    duration = timedelta(minutes=service.duration_minutes)
    buffer = timedelta(minutes=cfg.travel_buffer_minutes)
    step = timedelta(minutes=max(5, cfg.slot_step_minutes))
    earliest = now + timedelta(minutes=cfg.min_lead_minutes)

    slots: list[Slot] = []
    start = day_open
    while start + duration <= day_close:
        end = start + duration
        held_until = end + buffer
        ok = (
            start >= earliest
            and not any(_overlaps(start, end, p0, p1) for p0, p1 in pauses)
            and not any(_overlaps(start, end, b.start_at, b.end_at) for b in blocked)
            and not any(_overlaps(start, held_until, b.start_at, b.blocked_until) for b in bookings)
        )
        if ok:
            slots.append(Slot(start_at=start, end_at=end))
        start += step
    return slots


async def is_slot_available(db: AsyncSession, service: Service, start_at: datetime, cfg: BarberSettings) -> bool:
    day = start_at.astimezone(timezone.tz_info).date()
    wanted = start_at.astimezone(dt_timezone.utc)
    return any(s.start_at.astimezone(dt_timezone.utc) == wanted for s in await slots_for_day(db, service, day, cfg))
