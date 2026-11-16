"""OTP login, pseudo, Ivorian numbering, roles."""
import pytest

from tests.conftest import fresh_ip, fresh_phone, login


@pytest.mark.parametrize('typed', [
    '07 01 02 03 04', '+225 07 01 02 03 04', '00225 0701020304', '225 0701020304', '0701020304',
])
def test_ivorian_10_digit_numbers_normalize_to_one_identifier(typed):
    from backend.utils.phone import normalize_phone

    assert normalize_phone(typed) == '2250701020304'


def test_short_local_number_gets_country_code():
    from backend.utils.phone import normalize_phone

    assert normalize_phone('88 01 62 04') == '22588016204'


def test_legacy_whatsapp_fallback_candidates():
    from backend.common.whatsapp.gowa import _candidates

    assert _candidates('2250788016204') == ['2250788016204', '22588016204']
    assert _candidates('33612345678') == ['33612345678']


async def test_otp_login_creates_user_with_user_role_and_needs_pseudo(http, sent):
    phone = fresh_phone()
    who = await login(http, phone, pseudo=None)
    assert who['user']['phone'] == '225' + phone
    assert [r['name'] for r in who['user']['roles']] == ['user']
    assert who['login']['is_new_user'] is True
    assert who['login']['needs_pseudo'] is True
    # The OTP went to the client's number through the (captured) GOWA sender.
    assert any(p == '225' + phone and '123456' in m for p, m in sent)


async def test_wrong_code_then_replay_refused(http):
    phone = fresh_phone()
    await http.post('/auth/whatsapp/request-otp', json={'phone': phone}, headers=fresh_ip())
    r = await http.post('/auth/whatsapp/verify-otp', json={'phone': phone, 'code': '000000'}, headers=fresh_ip())
    assert r.status_code == 403 and 'incorrect' in r.json()['msg'].lower()
    r = await http.post('/auth/whatsapp/verify-otp', json={'phone': phone, 'code': '123456'}, headers=fresh_ip())
    assert r.status_code == 200
    r = await http.post('/auth/whatsapp/verify-otp', json={'phone': phone, 'code': '123456'}, headers=fresh_ip())
    assert r.status_code == 403  # single use


async def test_pseudo_unique_case_insensitive_and_validated(http):
    a = await login(http, pseudo='Koffi.B')
    b = await login(http, pseudo=None)
    r = await http.patch('/auth/me', json={'pseudo': 'koffi.b'}, headers=b['headers'])
    assert r.status_code == 403
    r = await http.patch('/auth/me', json={'pseudo': 'x'}, headers=b['headers'])
    assert r.status_code == 422
    r = await http.patch('/auth/me', json={'pseudo': 'Le Barber Officiel'}, headers=b['headers'])
    assert r.status_code == 422  # reserved word
    r = await http.get('/auth/me', headers=a['headers'])
    assert r.json()['data']['pseudo'] == 'Koffi.B'


async def test_relogin_existing_user_does_not_need_pseudo(http):
    phone = fresh_phone()
    await login(http, phone, pseudo='Awa225')
    # The resend cooldown is working as intended; lift it for the second login.
    from backend.core.conf import settings
    from backend.database.db_redis import redis_client

    await redis_client.delete(f'{settings.OTP_REDIS_PREFIX}:cooldown:login:225{phone}')
    again = await login(http, phone, pseudo=None)
    assert again['login']['is_new_user'] is False
    assert again['login']['needs_pseudo'] is False
