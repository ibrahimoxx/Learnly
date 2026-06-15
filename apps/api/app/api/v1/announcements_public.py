from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func as sql_func

from app.core.auth import get_optional_user
from app.db.session import get_db
from app.db.tables.platform_announcement import PlatformAnnouncement
from app.db.tables.user import User
from app.schemas.platform_announcement import PlatformAnnouncementRead

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("/active", response_model=list[PlatformAnnouncementRead])
async def list_active_announcements(
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[PlatformAnnouncement]:
    now = sql_func.now()
    audiences = ["all"]
    if user is not None:
        if user.role == "student":
            audiences.append("students")
        elif user.role == "instructor":
            audiences.append("instructors")

    result = await db.execute(
        select(PlatformAnnouncement)
        .where(
            PlatformAnnouncement.is_active.is_(True),
            PlatformAnnouncement.audience.in_(audiences),
            or_(PlatformAnnouncement.starts_at.is_(None), PlatformAnnouncement.starts_at <= now),
            or_(PlatformAnnouncement.ends_at.is_(None), PlatformAnnouncement.ends_at >= now),
        )
        .order_by(PlatformAnnouncement.created_at.desc())
    )
    return list(result.scalars().all())
