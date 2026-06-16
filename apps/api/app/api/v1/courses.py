import math
import re
import uuid

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user, require_instructor
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.notification import Notification
from app.db.tables.user import User
from app.schemas.course import (
    CourseCreate,
    CourseDetailRead,
    CourseListRead,
    CourseRead,
    CourseUpdate,
    PaginatedCourses,
)

log = structlog.get_logger()
router = APIRouter(prefix="/courses", tags=["courses"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug[:200]


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug = base
    i = 1
    while True:
        result = await db.execute(select(Course).where(Course.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{i}"
        i += 1


@router.get("", response_model=PaginatedCourses)
async def list_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    level: str | None = None,
    language: str | None = None,
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCourses:
    query = select(Course).options(selectinload(Course.category))
    if status_filter:
        query = query.where(Course.status == status_filter)
    else:
        query = query.where(Course.status == "published")
    if level:
        query = query.where(Course.level == level)
    if language:
        query = query.where(Course.language == language)
    if q:
        query = query.where(Course.title.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    courses = result.scalars().all()

    return PaginatedCourses(
        items=[CourseListRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit),
    )


@router.get("/mine", response_model=list[CourseRead])
async def my_courses(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[CourseRead]:
    result = await db.execute(select(Course).where(Course.instructor_id == instructor.id))
    return [CourseRead.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> CourseRead:
    slug = await _unique_slug(db, _slugify(body.title))
    course = Course(
        slug=slug,
        instructor_id=instructor.id,
        **body.model_dump(),
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    log.info("course_created", course_id=str(course.id), instructor_id=str(instructor.id))
    return CourseRead.model_validate(course)


@router.get("/{course_id}", response_model=CourseRead)
async def get_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> CourseRead:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return CourseRead.model_validate(course)


@router.get("/slug/{slug}", response_model=CourseDetailRead)
async def get_course_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> CourseDetailRead:
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.instructor), selectinload(Course.category))
        .where(
            Course.slug == slug,
            Course.status == "published",
            Course.organization_id.is_(None),
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return CourseDetailRead.model_validate(course)


async def _run_embed_bg(course_id: str) -> None:
    from app.services.embeddings import _run_embed
    await _run_embed(course_id)


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: uuid.UUID,
    body: CourseUpdate,
    background_tasks: BackgroundTasks,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> CourseRead:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.instructor_id != instructor.id and instructor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)

    if body.status == "published":
        background_tasks.add_task(_run_embed_bg, str(course.id))

    if body.status == "in_review":
        admins = await db.execute(select(User.id).where(User.role == "admin"))
        for admin_id in admins.scalars().all():
            db.add(Notification(
                user_id=admin_id,
                type="course_review",
                title="Course submitted for review",
                body=f'"{course.title}" is pending review',
                link="/admin/courses",
            ))
        await db.commit()

    return CourseRead.model_validate(course)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.instructor_id != instructor.id and instructor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    await db.delete(course)
    await db.commit()
