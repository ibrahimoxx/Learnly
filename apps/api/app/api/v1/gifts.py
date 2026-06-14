import uuid

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


def _build_gift_reads(gifts: list[Gift], other_user_attr: str) -> list[GiftRead]:
    groups: dict[uuid.UUID, list[Gift]] = {}
    order: list[uuid.UUID] = []
    for gift in gifts:
        key = gift.batch_id or gift.id
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(gift)

    reads: list[GiftRead] = []
    for key in order:
        group = groups[key]
        head = group[0]
        other_user = getattr(head, other_user_attr)
        courses = [GiftCourseInfo.model_validate(gift.course) for gift in group]
        reads.append(
            GiftRead(
                id=head.id,
                course=courses[0],
                other_user=GiftUserInfo.model_validate(other_user),
                message=head.message,
                created_at=head.created_at,
                courses=courses if len(group) > 1 else None,
            )
        )
    return reads


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
        sent=_build_gift_reads(list(sent_gifts), "recipient"),
        received=_build_gift_reads(list(received_gifts), "sender"),
    )
