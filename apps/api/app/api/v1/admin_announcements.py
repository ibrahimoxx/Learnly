import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.platform_announcement import PlatformAnnouncement
from app.db.tables.user import User
from app.schemas.platform_announcement import (
    PlatformAnnouncementCreate,
    PlatformAnnouncementRead,
    PlatformAnnouncementUpdate,
)

router = APIRouter(prefix="/admin/announcements", tags=["admin-announcements"])

@router.get("", response_model=list[PlatformAnnouncementRead])
async def list_announcements(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[PlatformAnnouncement]:
    result = await db.execute(select(PlatformAnnouncement).order_by(PlatformAnnouncement.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=PlatformAnnouncementRead, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    body: PlatformAnnouncementCreate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> PlatformAnnouncement:
    announcement = PlatformAnnouncement(
        title=body.title,
        body=body.body,
        audience=body.audience,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        created_by=admin.id,
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.patch("/{announcement_id}", response_model=PlatformAnnouncementRead)
async def update_announcement(
    announcement_id: uuid.UUID,
    body: PlatformAnnouncementUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> PlatformAnnouncement:
    result = await db.execute(select(PlatformAnnouncement).where(PlatformAnnouncement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    if body.title is not None:
        announcement.title = body.title
    if body.body is not None:
        announcement.body = body.body
    if body.audience is not None:
        announcement.audience = body.audience
    if body.is_active is not None:
        announcement.is_active = body.is_active
    if body.starts_at is not None:
        announcement.starts_at = body.starts_at
    if body.ends_at is not None:
        announcement.ends_at = body.ends_at

    await db.commit()
    await db.refresh(announcement)
    return announcement


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(PlatformAnnouncement).where(PlatformAnnouncement.id == announcement_id))
    announcement = result.scalar_one_or_none()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    await db.delete(announcement)
    await db.commit()
