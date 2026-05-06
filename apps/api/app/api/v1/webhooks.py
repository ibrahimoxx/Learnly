import hashlib
import hmac
import time

import structlog
from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.config import settings
from app.db.session import get_db
from app.db.tables.user import User

log = structlog.get_logger()
router = APIRouter()


def _verify_clerk_webhook(payload: bytes, svix_id: str, svix_ts: str, svix_sig: str) -> None:
    signed = f"{svix_id}.{svix_ts}.{payload.decode()}"
    secret = settings.clerk_webhook_secret.removeprefix("whsec_")
    import base64
    key = base64.b64decode(secret)
    expected = "v1," + base64.b64encode(
        hmac.new(key, signed.encode(), hashlib.sha256).digest()
    ).decode()
    if not hmac.compare_digest(expected, svix_sig.split(" ")[0]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
    # Reject stale webhooks (> 5 min)
    if abs(time.time() - int(svix_ts)) > 300:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook timestamp too old")


@router.post("/webhooks/clerk")
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: str = Header(..., alias="svix-id"),
    svix_timestamp: str = Header(..., alias="svix-timestamp"),
    svix_signature: str = Header(..., alias="svix-signature"),
) -> dict:
    body = await request.body()

    if settings.clerk_webhook_secret != "whsec_placeholder":
        _verify_clerk_webhook(body, svix_id, svix_timestamp, svix_signature)

    import json
    event = json.loads(body)
    event_type: str = event.get("type", "")
    data: dict = event.get("data", {})

    log.info("clerk_webhook_received", event_type=event_type, event_id=svix_id)

    if event_type == "user.created":
        await _upsert_user(db, data)
    elif event_type == "user.updated":
        await _upsert_user(db, data)
    elif event_type == "user.deleted":
        await _deactivate_user(db, data.get("id", ""))

    return {"received": True}


async def _upsert_user(db: AsyncSession, data: dict) -> None:
    clerk_id: str = data["id"]
    email: str = (data.get("email_addresses") or [{}])[0].get("email_address", "")
    first_name: str = data.get("first_name") or ""
    last_name: str = data.get("last_name") or ""
    image_url: str | None = data.get("image_url")
    role: str = data.get("public_metadata", {}).get("role", "student")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.image_url = image_url
        user.role = role
    else:
        user = User(
            clerk_id=clerk_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            image_url=image_url,
            role=role,
        )
        db.add(user)

    await db.commit()
    log.info("user_upserted", clerk_id=clerk_id, role=role)


async def _deactivate_user(db: AsyncSession, clerk_id: str) -> None:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_active = False
        await db.commit()
        log.info("user_deactivated", clerk_id=clerk_id)
