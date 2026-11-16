"""BARBER domain: services, availability, bookings and the notification outbox.

Money is stored in FCFA as integers. Datetimes are timezone-aware (UTC in the
database); the business timezone is ``settings.DATETIME_TIMEZONE``
(Africa/Abidjan).
"""
from datetime import datetime, time

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ExcludeConstraint, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.common.enums import BookingStatus, NotificationStatus
from backend.common.model import Base, get_id, id_key


class Service(Base):
    """A bookable service (prestation). Prices are edited from the dashboard."""

    __tablename__ = 'barber_service'

    id: Mapped[id_key] = mapped_column(init=False)
    name: Mapped[str] = mapped_column(sa.String(120))
    price: Mapped[int] = mapped_column(sa.Integer, comment='FCFA')
    duration_minutes: Mapped[int] = mapped_column(sa.Integer, default=45)
    description: Mapped[str | None] = mapped_column(sa.String(500), default=None)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, server_default=sa.true())
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, server_default='0')

    __table_args__ = (
        sa.CheckConstraint('price >= 0', name='ck_barber_service_price'),
        sa.CheckConstraint('duration_minutes BETWEEN 5 AND 600', name='ck_barber_service_duration'),
    )


class BarberSettings(Base):
    """Single-row settings edited from /admin/reglages (id 1).

    Until the row exists, the BOOKING_* values of core/conf.py apply.
    ``whatsapp_number`` / ``call_number`` are the barber's PERSONAL numbers,
    used for the client's "contact the barber" buttons. They are never the
    GOWA system number, which only sends automatic messages.
    """

    __tablename__ = 'barber_settings'

    id: Mapped[id_key] = mapped_column(init=False)
    display_name: Mapped[str] = mapped_column(sa.String(120), default='Barber')
    whatsapp_number: Mapped[str | None] = mapped_column(sa.String(20), default=None)
    call_number: Mapped[str | None] = mapped_column(sa.String(20), default=None)
    slot_step_minutes: Mapped[int] = mapped_column(sa.Integer, default=30)
    travel_buffer_minutes: Mapped[int] = mapped_column(sa.Integer, default=30)
    pending_expiry_minutes: Mapped[int] = mapped_column(sa.Integer, default=120)
    cancel_min_hours: Mapped[int] = mapped_column(sa.Integer, default=3)
    min_lead_minutes: Mapped[int] = mapped_column(sa.Integer, default=120)
    horizon_days: Mapped[int] = mapped_column(sa.Integer, default=30)
    communes: Mapped[list[str]] = mapped_column(JSONB, default_factory=list, server_default='[]')


class WorkingDay(Base):
    """Opening hours for one weekday (0 = Monday ... 6 = Sunday)."""

    __tablename__ = 'barber_working_day'

    id: Mapped[id_key] = mapped_column(init=False)
    weekday: Mapped[int] = mapped_column(sa.SmallInteger, unique=True)
    is_open: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    start_time: Mapped[time] = mapped_column(sa.Time, default=time(9, 0))
    end_time: Mapped[time] = mapped_column(sa.Time, default=time(19, 0))

    __table_args__ = (
        sa.CheckConstraint('weekday BETWEEN 0 AND 6', name='ck_working_day_weekday'),
        sa.CheckConstraint('end_time > start_time', name='ck_working_day_range'),
    )


class BreakPeriod(Base):
    """A recurring pause inside a working day (e.g. lunch 13:00-14:00)."""

    __tablename__ = 'barber_break'

    id: Mapped[id_key] = mapped_column(init=False)
    weekday: Mapped[int] = mapped_column(sa.SmallInteger, index=True)
    start_time: Mapped[time] = mapped_column(sa.Time)
    end_time: Mapped[time] = mapped_column(sa.Time)
    label: Mapped[str | None] = mapped_column(sa.String(80), default=None)

    __table_args__ = (
        sa.CheckConstraint('weekday BETWEEN 0 AND 6', name='ck_break_weekday'),
        sa.CheckConstraint('end_time > start_time', name='ck_break_range'),
    )


class BlockedPeriod(Base):
    """A one-off unavailability (day off, holiday, half-day...)."""

    __tablename__ = 'barber_blocked_period'

    id: Mapped[id_key] = mapped_column(init=False)
    start_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(sa.String(200), default=None)

    __table_args__ = (sa.CheckConstraint('end_at > start_at', name='ck_blocked_range'),)


# Statuses that hold a slot. A PENDING request holds it until ``expires_at``.
ACTIVE_STATUSES = (BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value)


class Booking(Base):
    """A booking request. Service details are snapshotted at booking time."""

    __tablename__ = 'barber_booking'

    id: Mapped[id_key] = mapped_column(init=False)
    reference: Mapped[str] = mapped_column(sa.String(12), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(sa.ForeignKey('user.id', ondelete='SET NULL'), index=True)
    service_id: Mapped[int | None] = mapped_column(sa.ForeignKey('barber_service.id', ondelete='SET NULL'))
    service_name: Mapped[str] = mapped_column(sa.String(120))
    price: Mapped[int] = mapped_column(sa.Integer, comment='FCFA, snapshot')
    duration_minutes: Mapped[int] = mapped_column(sa.Integer)
    start_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
    # end_at + travel buffer: the range the barber is unavailable for.
    blocked_until: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
    customer_phone: Mapped[str] = mapped_column(sa.String(20), index=True)
    customer_pseudo: Mapped[str | None] = mapped_column(sa.String(30))
    commune: Mapped[str] = mapped_column(sa.String(60))
    quartier: Mapped[str] = mapped_column(sa.String(80))
    address: Mapped[str] = mapped_column(sa.String(300))
    landmark: Mapped[str | None] = mapped_column(sa.String(300), default=None)
    note: Mapped[str | None] = mapped_column(sa.String(500), default=None)
    status: Mapped[str] = mapped_column(
        sa.String(20), index=True, default=BookingStatus.PENDING.value, server_default=BookingStatus.PENDING.value
    )
    expires_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None, index=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    rejected_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    cancelled_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    cancelled_by: Mapped[str | None] = mapped_column(sa.String(10), default=None, comment='client|barber|system')
    status_reason: Mapped[str | None] = mapped_column(sa.String(300), default=None)

    __table_args__ = (
        # THE double-booking guard, enforced by PostgreSQL itself: two active
        # bookings (PENDING or CONFIRMED) can never overlap, travel buffer
        # included. Concurrent inserts/confirmations race on this constraint
        # and the loser gets an IntegrityError (exclusion_violation).
        ExcludeConstraint(
            (sa.text("tstzrange(start_at, blocked_until, '[)')"), '&&'),
            name='ex_barber_booking_no_overlap',
            using='gist',
            where=sa.text("status IN ('PENDING', 'CONFIRMED')"),
        ),
        sa.CheckConstraint('blocked_until >= end_at AND end_at > start_at', name='ck_booking_range'),
        sa.CheckConstraint(
            "status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED')", name='ck_booking_status'
        ),
    )


class Notification(Base):
    """Transactional outbox of WhatsApp messages sent through GOWA.

    Rows are written in the SAME transaction as the booking change, so a
    notification can never be lost; a background worker delivers them with
    retries and exponential backoff.
    """

    __tablename__ = 'barber_notification'

    id: Mapped[id_key] = mapped_column(init=False)
    x_id: Mapped[str] = mapped_column(sa.String(32), init=False, unique=True, default=get_id)
    booking_id: Mapped[int | None] = mapped_column(
        sa.ForeignKey('barber_booking.id', ondelete='CASCADE'), index=True
    )
    recipient: Mapped[str] = mapped_column(sa.String(20), comment='client | barber')
    phone: Mapped[str] = mapped_column(sa.String(20))
    kind: Mapped[str] = mapped_column(sa.String(40))
    message: Mapped[str] = mapped_column(sa.Text)
    status: Mapped[str] = mapped_column(
        sa.String(10), index=True, default=NotificationStatus.PENDING.value,
        server_default=NotificationStatus.PENDING.value,
    )
    attempts: Mapped[int] = mapped_column(sa.Integer, default=0, server_default='0')
    next_attempt_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), default=None)
    last_error: Mapped[str | None] = mapped_column(sa.String(500), default=None)

    booking: Mapped[Booking | None] = relationship(init=False, lazy='noload')
