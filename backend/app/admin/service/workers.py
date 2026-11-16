"""Background loop started with the app: expires stale requests and delivers
the notification outbox. Safe with several API replicas (row locks + SKIP
LOCKED), so no extra scheduler/broker is needed."""
import asyncio
import contextlib

from backend.app.admin.service import booking_service, notification_service
from backend.common.log import log
from backend.core.conf import settings
from backend.database.db_postgres import async_db_session


async def run_once() -> None:
    async with async_db_session.begin() as db:
        expired = await booking_service.expire_overdue(db)
        if expired:
            log.info(f'{len(expired)} pending booking(s) expired')
    await notification_service.deliver_due()


async def _loop() -> None:
    while True:
        try:
            await run_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - keep the loop alive
            log.error(f'background worker error: {exc}')
        await asyncio.sleep(settings.WORKER_INTERVAL_SECONDS)


_task: asyncio.Task | None = None


def start() -> None:
    global _task
    if settings.WORKERS_ENABLED and _task is None:
        _task = asyncio.create_task(_loop(), name='barber-workers')


async def stop() -> None:
    global _task
    if _task is not None:
        _task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _task
        _task = None
