"""Direct-contact links (barber's PERSONAL numbers, or a client's number for the
barber). Never used with the GOWA system number."""
from urllib.parse import quote


def whatsapp_url(phone: str | None, text: str | None = None) -> str | None:
    if not phone:
        return None
    url = f'https://wa.me/{phone}'
    return f'{url}?text={quote(text)}' if text else url


def call_url(phone: str | None) -> str | None:
    return f'tel:+{phone}' if phone else None


def display_phone(phone: str | None) -> str:
    """2250701020304 -> +225 07 01 02 03 04 (readable in messages)."""
    if not phone:
        return ''
    if phone.startswith('225') and len(phone) == 13:
        rest = phone[3:]
        return '+225 ' + ' '.join(rest[i:i + 2] for i in range(0, 10, 2))
    return f'+{phone}'
