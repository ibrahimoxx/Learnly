import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.db.tables.push_subscription import PushSubscription
from app.db.tables.user import User
from app.schemas.push import PushSubscribeRequest, VapidPublicKeyResponse

router = APIRouter(tags=["push"])


@router.get("/push/vapid-public-key", response_model=VapidPublicKeyResponse)
async def get_vapid_public_key() -> VapidPublicKeyResponse:
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post("/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    body: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == uuid.UUID(str(user.id)),
            PushSubscription.endpoint == body.endpoint,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.p256dh = body.p256dh
        existing.auth = body.auth
    else:
        db.add(
            PushSubscription(
                user_id=uuid.UUID(str(user.id)),
                endpoint=body.endpoint,
                p256dh=body.p256dh,
                auth=body.auth,
            )
        )
    await db.commit()


@router.delete("/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    body: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == uuid.UUID(str(user.id)),
            PushSubscription.endpoint == body.endpoint,
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
