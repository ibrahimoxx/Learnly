import math
import uuid
from decimal import Decimal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.user import User
from app.schemas.course import CourseListRead, PaginatedCourses
from app.schemas.user import InstructorProfileRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/me/become-instructor", status_code=status.HTTP_200_OK)
async def become_instructor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if current_user.role in ("instructor", "admin"):
        return {"role": current_user.role}

    # Update Clerk public_metadata.role
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"https://api.clerk.com/v1/users/{current_user.clerk_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}", "Content-Type": "application/json"},
            json={"public_metadata": {"role": "instructor"}},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to update Clerk role")

    # Update DB
    current_user.role = "instructor"
    await db.commit()
    return {"role": "instructor"}


async def _get_instructor(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
    return user


@router.get("/{user_id}/profile", response_model=InstructorProfileRead)
async def get_instructor_profile(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> InstructorProfileRead:
    user = await _get_instructor(user_id, db)

    stats_result = await db.execute(
        select(
            func.count(Course.id),
            func.coalesce(func.sum(Course.enrollment_count), 0),
            func.coalesce(func.avg(Course.rating), 0),
            func.coalesce(func.sum(Course.review_count), 0),
        ).where(
            Course.instructor_id == user.id,
            Course.status == "published",
            Course.organization_id.is_(None),
        )
    )
    total_courses, total_students, avg_rating, total_reviews = stats_result.one()
    if total_courses == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")

    return InstructorProfileRead(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        image_url=user.image_url,
        bio=user.bio,
        website=user.website,
        created_at=user.created_at,
        total_courses=total_courses,
        total_students=total_students,
        avg_rating=Decimal(str(avg_rating)).quantize(Decimal("0.01")),
        total_reviews=total_reviews,
    )


@router.get("/{user_id}/courses", response_model=PaginatedCourses)
async def list_instructor_courses(
    user_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCourses:
    await _get_instructor(user_id, db)

    base_query = select(Course).where(
        Course.instructor_id == user_id,
        Course.status == "published",
        Course.organization_id.is_(None),
    )
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()

    query = base_query.order_by(Course.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    courses = result.scalars().all()

    return PaginatedCourses(
        items=[CourseListRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit),
    )
