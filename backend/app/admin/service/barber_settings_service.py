"""Barber settings (single row) with env defaults until the row exists."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.admin.schema.barber import SettingsParam
from backend.common.exception import errors
from backend.core.conf import settings
from backend.models.barber import BarberSettings
from backend.utils.phone import normalize_phone

# Abidjan's communes, editable from /admin/reglages.
DEFAULT_COMMUNES = [
    'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi',
    'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon',
]


def _defaults() -> BarberSettings:
    row = BarberSettings(
        display_name=settings.BRAND_NAME,
        whatsapp_number=None,
        call_number=None,
        slot_step_minutes=settings.BOOKING_SLOT_STEP_MINUTES,
        travel_buffer_minutes=settings.BOOKING_TRAVEL_BUFFER_MINUTES,
        pending_expiry_minutes=settings.BOOKING_PENDING_EXPIRY_MINUTES,
        cancel_min_hours=settings.BOOKING_CANCEL_MIN_HOURS,
        min_lead_minutes=settings.BOOKING_MIN_LEAD_MINUTES,
        horizon_days=settings.BOOKING_HORIZON_DAYS,
    )
    row.communes = list(DEFAULT_COMMUNES)
    return row


async def get_settings(db: AsyncSession) -> BarberSettings:
    row = (await db.execute(select(BarberSettings).order_by(BarberSettings.id).limit(1))).scalars().first()
    return row or _defaults()


def _system_number() -> str | None:
    if not settings.GOWA_SYSTEM_NUMBER:
        return None
    try:
        return normalize_phone(settings.GOWA_SYSTEM_NUMBER)
    except ValueError:
        return None


async def update_settings(db: AsyncSession, obj: SettingsParam) -> BarberSettings:
    system = _system_number()
    if system and system in (obj.whatsapp_number, obj.call_number):
        # The GOWA number only sends automatic messages; clients must never be
        # told to contact the barber on it.
        raise errors.ForbiddenError(
            msg="Ce numéro est celui des notifications automatiques. Indiquez votre numéro personnel."
        )
    row = (await db.execute(select(BarberSettings).order_by(BarberSettings.id).limit(1))).scalars().first()
    if row is None:
        row = _defaults()
        db.add(row)
    for key, value in obj.model_dump().items():
        setattr(row, key, value)
    await db.flush()
    return row
