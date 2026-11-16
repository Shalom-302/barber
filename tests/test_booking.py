"""Availability, booking lifecycle, concurrency, notifications, contact links, security."""
import asyncio
from datetime import datetime, timedelta, timezone as dt_tz

import pytest
from sqlalchemy import select, update

from tests.conftest import booking_body, first_slot, fresh_ip, login, make_admin, next_open_day


async def _run_workers():
    from backend.app.admin.service import workers

    await workers.run_once()


async def _book(http, who, start_at, **extra):
    return await http.post('/barber/bookings', json=booking_body(start_at, **extra), headers=who['headers'])


# --------------------------------------------------------------------------- #
# Catalogue & availability
# --------------------------------------------------------------------------- #

async def test_services_and_prices_come_from_the_database(http):
    r = await http.get('/barber/services')
    prices = {s['name']: s['price'] for s in r.json()['data']}
    assert prices == {'Coupe avec la machine du client': 10000, 'Coupe avec la machine du barbier': 15000}


async def test_availability_respects_hours_break_and_sunday(http):
    day = next_open_day(2)
    r = await http.get('/barber/availability', params={'service_id': 1, 'date': day.isoformat()})
    hours = [s['start_at'][11:16] for s in r.json()['data']['slots']]
    assert hours[0] == '09:00'
    assert '12:30' not in hours and '13:00' not in hours  # 45 min would overlap the 13:00 pause
    assert '14:00' in hours
    assert hours[-1] == '18:00'  # 18:30 + 45 min > 19:00
    sunday = day + timedelta(days=(6 - day.weekday()) % 7 or 7)
    r = await http.get('/barber/availability', params={'service_id': 1, 'date': sunday.isoformat()})
    assert r.json()['data']['slots'] == []


async def test_pending_booking_holds_slot_with_travel_buffer(http):
    who = await login(http)
    day = next_open_day(3)
    start = await first_slot(http, day=day)
    r = await _book(http, who, start)
    assert r.status_code == 200, r.text
    r = await http.get('/barber/availability', params={'service_id': 1, 'date': day.isoformat()})
    hours = [s['start_at'][11:16] for s in r.json()['data']['slots']]
    # 09:00 + 45 min + 30 min travel = 10:15: 09:00, 09:30, 10:00 gone.
    assert hours[0] == '10:30'


# --------------------------------------------------------------------------- #
# Booking creation & rules
# --------------------------------------------------------------------------- #

async def test_booking_requires_pseudo_and_valid_slot(http):
    nopseudo = await login(http, pseudo=None)
    start = await first_slot(http, day=next_open_day(4))
    r = await _book(http, nopseudo, start)
    assert r.status_code == 403
    who = await login(http)
    bad = (datetime.fromisoformat(start) + timedelta(minutes=7)).isoformat()
    r = await _book(http, who, bad)
    assert r.status_code == 409
    r = await _book(http, who, start, commune='Paris')
    assert r.status_code == 400


async def test_booking_snapshot_and_notifications(http, sent):
    who = await login(http)
    start = await first_slot(http, service_id=2, day=next_open_day(5))
    r = await _book(http, who, start, service_id=2)
    b = r.json()['data']
    assert b['status'] == 'PENDING' and b['price'] == 15000 and b['expires_at']
    sent.clear()
    await _run_workers()
    to_client = [m for p, m in sent if p == who['phone']]
    assert to_client and b['reference'] in to_client[0]
    assert 'ne répondez pas à ce numéro' in to_client[0]


async def test_concurrent_requests_for_the_same_slot_only_one_wins(http):
    clients = [await login(http) for _ in range(10)]
    start = await first_slot(http, day=next_open_day(6))
    results = await asyncio.gather(*[_book(http, c, start) for c in clients])
    codes = sorted(r.status_code for r in results)
    assert codes.count(200) == 1, codes
    assert codes.count(409) == 9, codes


async def test_database_constraint_blocks_overlap_even_without_the_service_check():
    """The exclusion constraint is the real guard: insert directly, bypassing availability."""
    from sqlalchemy.exc import IntegrityError

    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Booking

    start = datetime.combine(next_open_day(20), datetime.min.time(), dt_tz.utc) + timedelta(hours=10)

    def make(ref):
        return Booking(
            reference=ref, user_id=None, service_id=1, service_name='x', price=1, duration_minutes=45,
            start_at=start, end_at=start + timedelta(minutes=45), blocked_until=start + timedelta(minutes=75),
            customer_phone='2250700000000', customer_pseudo=None, commune='Cocody', quartier='q', address='a',
            status='CONFIRMED',
        )

    async with async_db_session.begin() as db:
        db.add(make('BTESTX01'))
    with pytest.raises(IntegrityError):
        async with async_db_session.begin() as db:
            db.add(make('BTESTX02'))
    # A cancelled booking does not hold the slot.
    async with async_db_session.begin() as db:
        b = make('BTESTX03')
        b.status = 'CANCELLED'
        db.add(b)


async def test_expired_pending_frees_the_slot_and_notifies(http, sent):
    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Booking

    first = await login(http)
    second = await login(http)
    day = next_open_day(7)
    start = await first_slot(http, day=day)
    ref = (await _book(http, first, start)).json()['data']['reference']
    assert (await _book(http, second, start)).status_code == 409
    async with async_db_session.begin() as db:
        await db.execute(update(Booking).where(Booking.reference == ref)
                         .values(expires_at=datetime.now(dt_tz.utc) - timedelta(minutes=1)))
    r = await _book(http, second, start)  # expiry runs inside the booking transaction
    assert r.status_code == 200, r.text
    r = await http.get(f'/barber/bookings/{ref}', headers=first['headers'])
    assert r.json()['data']['status'] == 'CANCELLED' and r.json()['data']['cancelled_by'] == 'system'
    sent.clear()
    await _run_workers()
    assert any(p == first['phone'] and 'expiré' in m for p, m in sent)


# --------------------------------------------------------------------------- #
# Barber decisions & client cancellation
# --------------------------------------------------------------------------- #

async def test_admin_lifecycle_confirm_complete_and_reject(http, sent):
    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Booking

    admin = await make_admin(http)
    who = await login(http)
    day = next_open_day(8)
    b1 = (await _book(http, who, await first_slot(http, day=day))).json()['data']
    b2 = (await _book(http, who, await first_slot(http, day=day, index=3))).json()['data']

    r = await http.post(f"/barber-admin/bookings/{b1['id']}/confirm", headers=admin['headers'])
    assert r.status_code == 200 and r.json()['data']['status'] == 'CONFIRMED'
    r = await http.post(f"/barber-admin/bookings/{b1['id']}/confirm", headers=admin['headers'])
    assert r.status_code == 403  # already confirmed
    r = await http.post(f"/barber-admin/bookings/{b1['id']}/complete", headers=admin['headers'])
    assert r.status_code == 403  # not started yet

    r = await http.post(f"/barber-admin/bookings/{b2['id']}/reject", json={'reason': 'Indisponible'},
                        headers=admin['headers'])
    assert r.json()['data']['status'] == 'REJECTED'

    # Move b1 to the past, then it can be completed.
    async with async_db_session.begin() as db:
        past = datetime.now(dt_tz.utc) - timedelta(days=30)
        await db.execute(update(Booking).where(Booking.id == b1['id']).values(
            start_at=past, end_at=past + timedelta(minutes=45), blocked_until=past + timedelta(minutes=75)))
    r = await http.post(f"/barber-admin/bookings/{b1['id']}/complete", headers=admin['headers'])
    assert r.json()['data']['status'] == 'COMPLETED'

    sent.clear()
    await _run_workers()
    texts = [m for p, m in sent if p == who['phone']]
    assert any('CONFIRMÉ' in m for m in texts)
    assert any('Indisponible' in m for m in texts)
    assert any('merci' in m.lower() for m in texts)


async def test_client_cancel_rules(http):
    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Booking

    admin = await make_admin(http)
    who = await login(http)
    other = await login(http)
    day = next_open_day(9)
    pending = (await _book(http, who, await first_slot(http, day=day))).json()['data']
    assert pending['can_cancel'] is True
    # Another client cannot see or cancel it.
    assert (await http.post(f"/barber/bookings/{pending['reference']}/cancel", headers=other['headers'])).status_code == 404
    r = await http.post(f"/barber/bookings/{pending['reference']}/cancel", headers=who['headers'])
    assert r.json()['data']['status'] == 'CANCELLED'

    late = (await _book(http, who, await first_slot(http, day=day, index=4))).json()['data']
    await http.post(f"/barber-admin/bookings/{late['id']}/confirm", headers=admin['headers'])
    async with async_db_session.begin() as db:  # starts in 1 hour (< 3 h rule)
        soon = datetime.now(dt_tz.utc) + timedelta(hours=1)
        await db.execute(update(Booking).where(Booking.id == late['id']).values(
            start_at=soon, end_at=soon + timedelta(minutes=45), blocked_until=soon + timedelta(minutes=75)))
    r = await http.post(f"/barber/bookings/{late['reference']}/cancel", headers=who['headers'])
    assert r.status_code == 403 and 'Contactez' in r.json()['msg']


# --------------------------------------------------------------------------- #
# Personal contact numbers vs GOWA system number
# --------------------------------------------------------------------------- #

async def test_contact_links_use_barber_personal_numbers(http, monkeypatch):
    from backend.core.conf import settings

    admin = await make_admin(http)
    current = (await http.get('/barber-admin/settings', headers=admin['headers'])).json()['data']

    monkeypatch.setattr(settings, 'GOWA_SYSTEM_NUMBER', '+225 01 11 22 33 44')
    r = await http.put('/barber-admin/settings', headers=admin['headers'],
                       json={**current, 'whatsapp_number': '01 11 22 33 44'})
    assert r.status_code == 403  # the GOWA number can't be the barber's contact

    r = await http.put('/barber-admin/settings', headers=admin['headers'],
                       json={**current, 'whatsapp_number': '07 88 01 62 04', 'call_number': '05 44 33 22 11'})
    assert r.status_code == 200, r.text
    p = (await http.get('/barber/profile')).json()['data']
    assert p['whatsapp_url'].startswith('https://wa.me/2250788016204')
    assert p['call_url'] == 'tel:+2250544332211'


async def test_admin_price_change_applies_to_new_bookings_only(http):
    admin = await make_admin(http)
    who = await login(http)
    day = next_open_day(10)
    before = (await _book(http, who, await first_slot(http, day=day))).json()['data']
    svc = next(s for s in (await http.get('/barber-admin/services', headers=admin['headers'])).json()['data'] if s['id'] == 1)
    r = await http.put('/barber-admin/services/1', headers=admin['headers'], json={**svc, 'price': 12000})
    assert r.json()['data']['price'] == 12000
    after = (await _book(http, who, await first_slot(http, day=day, index=5))).json()['data']
    assert before['price'] == 10000 and after['price'] == 12000
    await http.put('/barber-admin/services/1', headers=admin['headers'], json={**svc, 'price': 10000})


# --------------------------------------------------------------------------- #
# Authorization
# --------------------------------------------------------------------------- #

async def test_dashboard_is_admin_only(http):
    who = await login(http)
    for path in ['/barber-admin/overview', '/barber-admin/bookings', '/barber-admin/clients',
                 '/barber-admin/settings', '/barber-admin/notifications']:
        assert (await http.get(path, headers=who['headers'])).status_code == 403, path
        assert (await http.get(path, headers=fresh_ip())).status_code in (401, 403), path
    assert (await http.post('/barber/bookings', json={}, headers=fresh_ip())).status_code in (401, 403)


async def test_blocked_period_removes_slots(http):
    from backend.utils.timezone import timezone

    admin = await make_admin(http)
    day = next_open_day(11)
    start = datetime.combine(day, datetime.min.time(), timezone.tz_info)
    r = await http.post('/barber-admin/blocked', headers=admin['headers'], json={
        'start_at': start.isoformat(), 'end_at': (start + timedelta(days=1)).isoformat(), 'reason': 'Congé'})
    assert r.status_code == 200
    r = await http.get('/barber/availability', params={'service_id': 1, 'date': day.isoformat()})
    assert r.json()['data']['slots'] == []


# --------------------------------------------------------------------------- #
# Notification retries
# --------------------------------------------------------------------------- #

async def test_notification_retry_with_backoff_then_success(http, monkeypatch):
    from backend.app.admin.service import notification_service
    from backend.common.exception import errors
    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Notification

    who = await login(http)
    b = (await _book(http, who, await first_slot(http, day=next_open_day(12)))).json()['data']
    calls = {'n': 0}

    async def flaky(phone, message):
        calls['n'] += 1
        raise errors.ServerError(msg='GOWA down')

    monkeypatch.setattr(notification_service, 'send_whatsapp_text', flaky)
    await _run_workers()
    async with async_db_session() as db:
        n = (await db.execute(select(Notification).where(Notification.booking_id == b['id'],
                                                          Notification.recipient == 'client'))).scalars().first()
        assert n.status == 'pending' and n.attempts == 1 and n.next_attempt_at > datetime.now(dt_tz.utc)
        assert 'GOWA down' in n.last_error

    ok = []

    async def works(phone, message):
        ok.append(phone)

    monkeypatch.setattr(notification_service, 'send_whatsapp_text', works)
    async with async_db_session.begin() as db:  # make it due now
        await db.execute(update(Notification).where(Notification.id == n.id)
                         .values(next_attempt_at=datetime.now(dt_tz.utc)))
    await _run_workers()
    async with async_db_session() as db:
        n = await db.get(Notification, n.id)
        assert n.status == 'sent' and n.attempts == 2


async def test_notification_gives_up_after_max_attempts(http, monkeypatch):
    from backend.app.admin.service import notification_service
    from backend.core.conf import settings
    from backend.database.db_postgres import async_db_session
    from backend.models.barber import Notification

    async def down(phone, message):
        raise RuntimeError('timeout')

    monkeypatch.setattr(notification_service, 'send_whatsapp_text', down)
    async with async_db_session.begin() as db:
        n = Notification(booking_id=None, recipient='client', phone='2250700000001', kind='test', message='x',
                         next_attempt_at=datetime.now(dt_tz.utc))
        n.attempts = settings.NOTIFY_MAX_ATTEMPTS - 1
        db.add(n)
    await _run_workers()
    admin = await make_admin(http)
    async with async_db_session() as db:
        n = await db.get(Notification, n.id)
        assert n.status == 'failed'
    r = await http.post(f'/barber-admin/notifications/{n.id}/retry', headers=admin['headers'])
    assert r.json()['data']['status'] == 'pending'


async def test_public_hours(http):
    r = await http.get('/barber/hours')
    data = r.json()['data']
    assert len(data['days']) == 7
    assert data['days'][6]['is_open'] is False  # Sunday closed by default
    assert any(b['label'] == 'Pause déjeuner' for b in data['breaks'])


async def test_settings_reject_mojibake(http):
    admin = await make_admin(http)
    current = (await http.get('/barber-admin/settings', headers=admin['headers'])).json()['data']
    r = await http.put('/barber-admin/settings', headers=admin['headers'],
                       json={**current, 'communes': ['AdjamÃ©']})
    assert r.status_code == 422
    r = await http.put('/barber-admin/settings', headers=admin['headers'],
                       json={**current, 'communes': ['Cocody', 'Adjamé', 'Port-Bouët']})
    assert r.status_code == 200 and r.json()['data']['communes'] == ['Cocody', 'Adjamé', 'Port-Bouët']
    await http.put('/barber-admin/settings', headers=admin['headers'], json=current)  # restore


async def test_admin_clients_list(http):
    admin = await make_admin(http)
    who = await login(http, pseudo='ClientListe')
    b = await _book(http, who, await first_slot(http, day=next_open_day(13)))
    assert b.status_code == 200, b.text
    r = await http.get('/barber-admin/clients', params={'q': 'ClientListe'}, headers=admin['headers'])
    assert r.status_code == 200, r.text
    items = r.json()['data']['items']
    assert len(items) == 1 and items[0]['bookings_total'] == 1
    assert items[0]['last_commune'] == 'Cocody' and items[0]['whatsapp_url'].startswith('https://wa.me/225')
