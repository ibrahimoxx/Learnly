import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.gift import Gift
from app.db.tables.user import User
from app.schemas.gift import GiftCourseInfo, GiftListRead, GiftRead, GiftUserInfo

log = structlog.get_logger()
router = APIRouter(prefix="/gifts", tags=["gifts"])


@router.get("", response_model=GiftListRead)
async def list_gifts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GiftListRead:
    sent_result = await db.execute(
        select(Gift)
        .options(selectinload(Gift.course), selectinload(Gift.recipient))
        .where(Gift.sender_id == user.id)
        .order_by(Gift.created_at.desc())
    )
    sent_gifts = sent_result.scalars().all()

    received_result = await db.execute(
        select(Gift)
        .options(selectinload(Gift.course), selectinload(Gift.sender))
        .where(Gift.recipient_id == user.id)
        .order_by(Gift.created_at.desc())
    )
    received_gifts = received_result.scalars().all()

    return GiftListRead(
        sent=[
            GiftRead(
                id=gift.id,
                course=GiftCourseInfo.model_validate(gift.course),
                other_user=GiftUserInfo.model_validate(gift.recipient),
                message=gift.message,
                created_at=gift.created_at,
            )
            for gift in sent_gifts
        ],
        received=[
            GiftRead(
                id=gift.id,
                course=GiftCourseInfo.model_validate(gift.course),
                other_user=GiftUserInfo.model_validate(gift.sender),
                message=gift.message,
                created_at=gift.created_at,
            )
            for gift in received_gifts
        ],
    )
