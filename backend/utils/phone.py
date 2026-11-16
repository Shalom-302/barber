"""Phone number normalization (WhatsApp login identifier).

Stored form: digits only, country code first, no ``+``.

With the Côte d'Ivoire defaults (``PHONE_DEFAULT_COUNTRY_CODE=225``,
``PHONE_KEEP_LEADING_ZERO=true``) the current 10-digit numbering is kept as is:

    07 01 02 03 04          -> 2250701020304
    +225 07 01 02 03 04     -> 2250701020304
    00225 07 01 02 03 04    -> 2250701020304
    225 0701020304          -> 2250701020304

A number typed without its country code and without a leading 0 (e.g. an old
8-digit number ``88 01 62 04``) gets the default country code prepended.
Delivery to WhatsApp accounts still registered under the pre-2021 8-digit form
is handled at send time (common/whatsapp/gowa.py), never by changing the
stored identifier.
"""
from backend.core.conf import settings


def normalize_phone(value: str) -> str:
    raw = (value or '').strip()
    digits = ''.join(ch for ch in raw if ch.isdigit())
    cc = settings.PHONE_DEFAULT_COUNTRY_CODE.lstrip('+')
    if raw.startswith('+'):
        pass
    elif digits.startswith('00'):
        digits = digits[2:]
    elif digits.startswith('0'):
        # Local number typed without the country code.
        if not cc:
            raise ValueError('Phone number must include the country code (e.g. +33...).')
        digits = cc + (digits if settings.PHONE_KEEP_LEADING_ZERO else digits[1:])
    elif cc and not digits.startswith(cc) and len(digits) <= 10:
        # Short local form without a leading 0.
        digits = cc + digits
    if not (8 <= len(digits) <= 15):
        raise ValueError('Numéro de téléphone invalide (indicatif + numéro).')
    # Côte d'Ivoire: 10 national digits since 2021 (8 before). Anything else is
    # a typo that would create an account WhatsApp can never reach.
    if digits.startswith('225') and len(digits) not in (13, 11):
        raise ValueError('Numéro ivoirien invalide : 10 chiffres attendus (ex. 07 01 02 03 04).')
    return digits
