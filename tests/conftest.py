"""Test fixtures.

Runs against a throwaway ``barber_test`` database (recreated and migrated with
Alembic at session start) and Redis db 15 (flushed). WhatsApp sends are
captured instead of going to GOWA. Run with:

    docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm tests
"""
import asyncio
import itertools
import os
import subprocess
from datetime import date, datetime, timedelta

import pytest

os.environ.setdefault('POSTGRES_DATABASE', 'barber_test')
os.environ['WORKERS_ENABLED'] = 'false'
os.environ['NOTIFY_SEND_GAP_SECONDS'] = '0'
os.environ['GOWA_URL'] = ''


async def _recreate_database_async() -> None:
    import asyncpg

    from backend.core.conf import settings

    conn = await asyncpg.connect(
        host=settings.POSTGRES_HOST, port=settings.POSTGRES_PORT, user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD, database='postgres',
    )
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{settings.POSTGRES_DATABASE}" WITH (FORCE)')
        await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DATABASE}"')
    finally:
        await conn.close()


def pytest_sessionstart(session):
    from backend.core.conf import settings

    assert settings.POSTGRES_DATABASE.endswith('_test'), 'refusing to run tests on a non-test database'
    asyncio.run(_recreate_database_async())
    subprocess.run(['alembic', 'upgrade', 'head'], cwd='backend', check=True, capture_output=True)


@pytest.fixture(scope='session')
async def app():
    from backend.core.registrar import register_init
    from backend.database.db_redis import redis_client
    from backend.main import app as fastapi_app

    async with register_init(fastapi_app):
        await redis_client.flushdb()
        yield fastapi_app


@pytest.fixture(scope='session')
async def http(app):
    import httpx

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test/admin/api/v1') as client:
        yield client


@pytest.fixture(autouse=True)
def sent(monkeypatch):
    """Capture every WhatsApp message instead of calling GOWA."""
    outbox: list[tuple[str, str]] = []

    async def fake_send(phone: str, message: str) -> None:
        outbox.append((phone, message))

    from backend.app.admin.service import notification_service

    monkeypatch.setattr(notification_service, 'send_whatsapp_text', fake_send)
    monkeypatch.setattr('backend.app.admin.service.otp_service.send_whatsapp_text', fake_send)
    monkeypatch.setattr('backend.app.admin.service.otp_service._gen_code', lambda: '123456')
    return outbox


_ip = itertools.count(1)
_phone = itertools.count(1001)


def fresh_ip() -> dict:
    """A distinct client IP per call, so per-IP rate limits don't interfere."""
    n = next(_ip)
    return {'X-Forwarded-For': f'10.{n // 65536 % 256}.{n // 256 % 256}.{n % 256}'}


def fresh_phone() -> str:
    """A unique Ivorian 10-digit number (new numbering), local form."""
    return f'07{next(_phone):08d}'


async def login(http, phone: str | None = None, pseudo: str | None = 'auto') -> dict:
    """WhatsApp OTP login. Returns {'token', 'headers', 'user', 'phone'}."""
    phone = phone or fresh_phone()
    r = await http.post('/auth/whatsapp/request-otp', json={'phone': phone}, headers=fresh_ip())
    assert r.status_code == 200, r.text
    r = await http.post('/auth/whatsapp/verify-otp', json={'phone': phone, 'code': '123456'}, headers=fresh_ip())
    assert r.status_code == 200, r.text
    data = r.json()['data']
    headers = {'Authorization': f"Bearer {data['access_token']}", **fresh_ip()}
    if pseudo:
        name = f'client{next(_phone)}' if pseudo == 'auto' else pseudo
        r = await http.patch('/auth/me', json={'pseudo': name}, headers=headers)
        assert r.status_code == 200, r.text
    return {'token': data['access_token'], 'headers': headers, 'user': data['user'], 'phone': data['user']['phone'],
            'login': data}


async def make_admin(http) -> dict:
    """Log in a number, then promote it with the same code path as `auth init --phone`."""
    from backend.common.enums import Role
    from backend.crud.crud_user import user_dao
    from backend.database.db_postgres import async_db_session
    from backend.database.db_redis import redis_client
    from backend.core.conf import settings

    who = await login(http, pseudo=None)
    async with async_db_session.begin() as db:
        user = await user_dao.get_by_phone(db, who['phone'])
        await user_dao.grant_role(db, user, Role.ADMIN.value)
    await redis_client.delete(f"{settings.JWT_USER_REDIS_PREFIX}:{who['user']['x_id']}")
    return who


def next_open_day(offset: int = 1) -> date:
    """A Monday-Saturday day at least *offset* days ahead (Sunday is closed)."""
    from backend.utils.timezone import timezone

    d = datetime.now(timezone.tz_info).date() + timedelta(days=offset)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


async def first_slot(http, service_id: int = 1, day: date | None = None, index: int = 0) -> str:
    day = day or next_open_day()
    r = await http.get('/barber/availability', params={'service_id': service_id, 'date': day.isoformat()})
    assert r.status_code == 200, r.text
    slots = r.json()['data']['slots']
    assert slots, f'no slot on {day}'
    return slots[index]['start_at']


def booking_body(start_at: str, service_id: int = 1, **extra) -> dict:
    return {
        'service_id': service_id, 'start_at': start_at, 'commune': 'Cocody', 'quartier': 'Angré',
        'address': 'Rue des Jardins, villa 12', 'landmark': 'Près de la pharmacie', **extra,
    }
