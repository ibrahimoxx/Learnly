import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.user import User
from app.db.tables.wishlist import WishlistItem

log = structlog.get_logger()
router = APIRouter(prefix="/wishlist", tags=["wishlist"])


class WishlistItemRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    course_slug: str
    course_price_in_cents: int
    course_is_free: bool
    course_image_url: str | None
    course_rating: float

    model_config = {"from_attributes": True}


@router.get("", response_model=list[WishlistItemRead])
async def list_wishlist(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WishlistItemRead]:
    result = await db.execute(
        select(WishlistItem)
        .options(selectinload(WishlistItem.course))
        .where(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
    )
    items = result.scalars().all()
    return [
        WishlistItemRead(
            id=item.id,
            course_id=item.course_id,
            course_title=item.course.title,
            course_slug=item.course.slug,
            course_price_in_cents=item.course.price_in_cents,
            course_is_free=item.course.is_free,
            course_image_url=item.course.image_url,
            course_rating=float(item.course.rating or 0),
        )
        for item in items
    ]


@router.post("/{course_id}", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    existing = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.course_id == course_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already in wishlist")

    item = WishlistItem(user_id=user.id, course_id=course_id)
    db.add(item)
    await db.commit()
    log.info("wishlist_item_added", user_id=str(user.id), course_id=str(course_id))
    return {"added": True}


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.course_id == course_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in wishlist")
    await db.delete(item)
    await db.commit()
    log.info("wishlist_item_removed", user_id=str(user.id), course_id=str(course_id))
