import asyncio
import json
import uuid

import structlog
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.tables.push_subscription import PushSubscription

log = structlog.get_logger()


async def send_push(
    user_id: uuid.UUID, title: str, body: str, url: str, db: AsyncSession
) -> None:
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subs = result.scalars().all()

    expired: list[PushSubscription] = []
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_claims_subject},
            )
        except WebPushException as exc:
            if exc.response and exc.response.status_code in (404, 410):
                expired.append(sub)
            else:
                log.warning("push_send_failed", endpoint=sub.endpoint[:40], error=str(exc))

    for sub in expired:
        await db.delete(sub)


async def _run_push(user_id: str, title: str, body: str, url: str) -> None:
    async with AsyncSessionLocal() as db:
        await send_push(uuid.UUID(user_id), title, body, url, db)
        await db.commit()


def schedule_push(user_id: uuid.UUID, title: str, body: str, url: str) -> None:
    """Fire-and-forget push notification from any async context."""
    asyncio.create_task(_run_push(str(user_id), title, body, url))
