from datetime import date, datetime, time

from pydantic import ConfigDict, Field, field_validator, model_validator

from backend.common.schema import SchemaBase
from backend.utils.phone import normalize_phone


# --------------------------------------------------------------------------- #
# Services (prestations)
# --------------------------------------------------------------------------- #

class ServiceParam(SchemaBase):
    name: str = Field(min_length=2, max_length=120)
    price: int = Field(ge=0, le=10_000_000, description='FCFA')
    duration_minutes: int = Field(ge=5, le=600)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool = True
    sort_order: int = 0


class ServiceOut(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: int
    duration_minutes: int
    description: str | None = None
    is_active: bool
    sort_order: int


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #

def _optional_phone(v: str | None) -> str | None:
    if v is None or not v.strip():
        return None
    return normalize_phone(v)


class SettingsParam(SchemaBase):
    display_name: str = Field(min_length=2, max_length=120)
    whatsapp_number: str | None = Field(default=None, max_length=25, description="Barber's PERSONAL WhatsApp")
    call_number: str | None = Field(default=None, max_length=25, description="Barber's PERSONAL phone")
    slot_step_minutes: int = Field(ge=5, le=240)
    travel_buffer_minutes: int = Field(ge=0, le=240)
    pending_expiry_minutes: int = Field(ge=5, le=60 * 24 * 7)
    cancel_min_hours: int = Field(ge=0, le=24 * 14)
    min_lead_minutes: int = Field(ge=0, le=60 * 24 * 7)
    horizon_days: int = Field(ge=1, le=365)
    communes: list[str] = Field(default_factory=list, max_length=100)

    _wa = field_validator('whatsapp_number')(_optional_phone)
    _call = field_validator('call_number')(_optional_phone)

    @field_validator('communes')
    @classmethod
    def _communes(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for c in v:
            c = ' '.join(c.split())[:60]
            if c and c not in out:
                out.append(c)
        return out


class SettingsOut(SettingsParam):
    model_config = ConfigDict(from_attributes=True)


class PublicProfileOut(SchemaBase):
    """What a client may see. Contact links use the barber's PERSONAL numbers."""

    display_name: str
    whatsapp_number: str | None = None
    whatsapp_url: str | None = None
    call_number: str | None = None
    call_url: str | None = None
    communes: list[str]
    cancel_min_hours: int
    pending_expiry_minutes: int
    horizon_days: int


# --------------------------------------------------------------------------- #
# Availability
# --------------------------------------------------------------------------- #

class WorkingDayParam(SchemaBase):
    weekday: int = Field(ge=0, le=6)
    is_open: bool
    start_time: time
    end_time: time

    @model_validator(mode='after')
    def _range(self):
        if self.end_time <= self.start_time:
            raise ValueError("L'heure de fin doit être après l'heure de début.")
        return self


class WorkingDayOut(WorkingDayParam):
    model_config = ConfigDict(from_attributes=True)


class BreakParam(SchemaBase):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    label: str | None = Field(default=None, max_length=80)

    @model_validator(mode='after')
    def _range(self):
        if self.end_time <= self.start_time:
            raise ValueError("La fin de la pause doit être après son début.")
        return self


class BreakOut(BreakParam):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ScheduleParam(SchemaBase):
    days: list[WorkingDayParam] = Field(min_length=7, max_length=7)
    breaks: list[BreakParam] = Field(default_factory=list, max_length=50)

    @field_validator('days')
    @classmethod
    def _all_days(cls, v: list[WorkingDayParam]) -> list[WorkingDayParam]:
        if sorted(d.weekday for d in v) != list(range(7)):
            raise ValueError('Les 7 jours de la semaine sont requis.')
        return v


class ScheduleOut(SchemaBase):
    days: list[WorkingDayOut]
    breaks: list[BreakOut]


class BlockedParam(SchemaBase):
    start_at: datetime
    end_at: datetime
    reason: str | None = Field(default=None, max_length=200)

    @model_validator(mode='after')
    def _range(self):
        if self.start_at.tzinfo is None or self.end_at.tzinfo is None:
            raise ValueError('Dates avec fuseau horaire requises (ISO 8601).')
        if self.end_at <= self.start_at:
            raise ValueError('La fin doit être après le début.')
        return self


class BlockedOut(BlockedParam):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SlotOut(SchemaBase):
    start_at: datetime
    end_at: datetime


class AvailabilityOut(SchemaBase):
    date: date
    service_id: int
    slots: list[SlotOut]


# --------------------------------------------------------------------------- #
# Bookings
# --------------------------------------------------------------------------- #

class CreateBookingParam(SchemaBase):
    service_id: int
    start_at: datetime
    commune: str = Field(min_length=2, max_length=60)
    quartier: str = Field(min_length=2, max_length=80)
    address: str = Field(min_length=3, max_length=300)
    landmark: str | None = Field(default=None, max_length=300)
    note: str | None = Field(default=None, max_length=500)

    @field_validator('start_at')
    @classmethod
    def _aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError('start_at doit contenir un fuseau horaire (ISO 8601).')
        return v


class ReasonParam(SchemaBase):
    reason: str | None = Field(default=None, max_length=300)


class BookingOut(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    service_id: int | None
    service_name: str
    price: int
    duration_minutes: int
    start_at: datetime
    end_at: datetime
    status: str
    commune: str
    quartier: str
    address: str
    landmark: str | None = None
    note: str | None = None
    expires_at: datetime | None = None
    confirmed_at: datetime | None = None
    rejected_at: datetime | None = None
    cancelled_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_by: str | None = None
    status_reason: str | None = None
    created_time: datetime
    can_cancel: bool = False


class AdminBookingOut(BookingOut):
    user_id: int | None = None
    customer_phone: str
    customer_pseudo: str | None = None
    customer_whatsapp_url: str | None = None
    customer_call_url: str | None = None


class ClientOut(SchemaBase):
    id: int
    pseudo: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    call_url: str | None = None
    join_time: datetime | None = None
    bookings_total: int = 0
    bookings_completed: int = 0
    last_booking_at: datetime | None = None
    last_commune: str | None = None
    last_quartier: str | None = None
    last_address: str | None = None


class NotificationOut(SchemaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int | None
    recipient: str
    phone: str
    kind: str
    message: str
    status: str
    attempts: int
    next_attempt_at: datetime | None = None
    sent_at: datetime | None = None
    last_error: str | None = None
    created_time: datetime
