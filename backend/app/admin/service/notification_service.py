"""WhatsApp notifications through the existing GOWA instance (transactional outbox).

``enqueue_*`` functions add rows to ``barber_notification`` inside the caller's
transaction. ``deliver_due`` (run by the background worker) sends them with
retries: exponential backoff, ``NOTIFY_MAX_ATTEMPTS`` tries, one message per
``NOTIFY_SEND_GAP_SECONDS`` (GOWA numbers get banned for bursts).

Every client message reminds that it comes from the automatic number and gives
the barber's PERSONAL contact, so clients never answer the GOWA number.
"""
import asyncio
from datetime import datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.admin.service.availability_service import now_utc
from backend.common.enums import NotificationStatus
from backend.common.exception import errors
from backend.common.log import log
from backend.common.whatsapp import WhatsappUnreachable, send_whatsapp_text
from backend.common.whatsapp.gowa import mask_phone
from backend.core.conf import settings
from backend.database.db_postgres import async_db_session
from backend.models.barber import BarberSettings, Booking, Notification
from backend.utils.contact import display_phone
from backend.utils.timezone import timezone

_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
           'septembre', 'octobre', 'novembre', 'décembre']


def fmt_when(dt: datetime) -> str:
    local = dt.astimezone(timezone.tz_info)
    return f'{_DAYS[local.weekday()]} {local.day} {_MONTHS[local.month - 1]} à {local:%H:%M}'


def fmt_price(amount: int) -> str:
    return f'{amount:,}'.replace(',', ' ') + ' FCFA'


def _booking_url(b: Booking) -> str:
    return f'{settings.SITE_URL.rstrip("/")}/mes-rendez-vous/{b.reference}'


def _contact_footer(cfg: BarberSettings) -> str:
    lines = ['', 'Message automatique, ne répondez pas à ce numéro.']
    if cfg.whatsapp_number:
        lines.append(f'Pour joindre votre barbier : https://wa.me/{cfg.whatsapp_number}')
    elif cfg.call_number:
        lines.append(f'Pour joindre votre barbier : {display_phone(cfg.call_number)}')
    return '\n'.join(lines)


def _summary(b: Booking) -> str:
    return (f'{b.service_name} ({fmt_price(b.price)})\n'
            f'{fmt_when(b.start_at)}\n'
            f'{b.commune}, {b.quartier}')


# Client-facing texts per booking event.
def client_message(kind: str, b: Booking, cfg: BarberSettings) -> str:
    head = {
        'booking_received': f'{cfg.display_name} : votre demande {b.reference} est bien reçue. '
                            'Le barbier va la confirmer.',
        'booking_confirmed': f'{cfg.display_name} : votre rendez-vous {b.reference} est CONFIRMÉ.',
        'booking_rejected': f'{cfg.display_name} : votre demande {b.reference} n\'a pas pu être acceptée.',
        'booking_cancelled': f'{cfg.display_name} : votre rendez-vous {b.reference} est annulé.',
        'booking_expired': f'{cfg.display_name} : votre demande {b.reference} a expiré sans confirmation. '
                           'Vous pouvez choisir un autre créneau.',
        'booking_completed': f'{cfg.display_name} : merci pour votre visite ! À bientôt.',
    }[kind]
    reason = f'\nMotif : {b.status_reason}' if b.status_reason and kind in (
        'booking_rejected', 'booking_cancelled') else ''
    body = '' if kind == 'booking_completed' else f'\n\n{_summary(b)}\n{_booking_url(b)}'
    return head + reason + body + '\n' + _contact_footer(cfg)


def barber_message(kind: str, b: Booking) -> str:
    who = b.customer_pseudo or display_phone(b.customer_phone)
    head = {
        'booking_new': f'Nouvelle demande {b.reference} de {who}.',
        'booking_cancelled_by_client': f'{who} a annulé le rendez-vous {b.reference}.',
    }[kind]
    admin_url = f'{settings.SITE_URL.rstrip("/")}/admin/reservations'
    return (f'{head}\n\n{_summary(b)}\n{b.address}'
            + (f'\nRepère : {b.landmark}' if b.landmark else '')
            + f'\nClient : {display_phone(b.customer_phone)}\n{admin_url}')


def enqueue(db: AsyncSession, *, booking: Booking | None, recipient: str, phone: str | None, kind: str,
            message: str) -> None:
    if not phone:
        return
    db.add(Notification(
        booking_id=booking.id if booking else None,
        recipient=recipient,
        phone=phone,
        kind=kind,
        message=message,
        next_attempt_at=now_utc(),
    ))


def enqueue_client(db: AsyncSession, kind: str, b: Booking, cfg: BarberSettings) -> None:
    enqueue(db, booking=b, recipient='client', phone=b.customer_phone, kind=kind,
            message=client_message(kind, b, cfg))


def enqueue_barber(db: AsyncSession, kind: str, b: Booking, cfg: BarberSettings) -> None:
    # Alerts go to the barber's personal WhatsApp (they are *received* there,
    # sent by the GOWA system number).
    enqueue(db, booking=b, recipient='barber', phone=cfg.whatsapp_number, kind=kind,
            message=barber_message(kind, b))


def _backoff(attempts: int) -> timedelta:
    return timedelta(seconds=min(3600, 30 * 2 ** max(0, attempts - 1)))


async def deliver_due(limit: int = 20) -> int:
    """Send due notifications. Safe to run concurrently (FOR UPDATE SKIP LOCKED)."""
    sent = 0
    async with async_db_session.begin() as db:
        now = now_utc()
        rows = (await db.execute(
            select(Notification)
            .where(
                Notification.status == NotificationStatus.PENDING.value,
                or_(Notification.next_attempt_at.is_(None), Notification.next_attempt_at <= now),
            )
            .order_by(Notification.id)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )).scalars().all()
        for n in rows:
            n.attempts += 1
            try:
                await send_whatsapp_text(n.phone, n.message)
            except WhatsappUnreachable:
                n.status = NotificationStatus.FAILED.value
                n.last_error = 'Numéro non joignable sur WhatsApp'
            except (errors.ServerError, Exception) as exc:  # noqa: BLE001 - GOWA down / timeout: retry
                n.last_error = str(getattr(exc, 'msg', exc))[:500]
                if n.attempts >= settings.NOTIFY_MAX_ATTEMPTS:
                    n.status = NotificationStatus.FAILED.value
                else:
                    n.next_attempt_at = now_utc() + _backoff(n.attempts)
                log.warning(f'notification {n.id} to {mask_phone(n.phone)} failed (try {n.attempts}): {n.last_error}')
            else:
                n.status = NotificationStatus.SENT.value
                n.sent_at = now_utc()
                n.last_error = None
                sent += 1
            await asyncio.sleep(settings.NOTIFY_SEND_GAP_SECONDS)
    return sent


async def retry(db: AsyncSession, notification_id: int) -> Notification:
    n = await db.get(Notification, notification_id)
    if n is None:
        raise errors.NotFoundError(msg='Notification introuvable')
    if n.status == NotificationStatus.SENT.value:
        raise errors.ForbiddenError(msg='Cette notification a déjà été envoyée.')
    n.status = NotificationStatus.PENDING.value
    n.attempts = 0
    n.next_attempt_at = now_utc()
    n.last_error = None
    await db.flush()
    return n
