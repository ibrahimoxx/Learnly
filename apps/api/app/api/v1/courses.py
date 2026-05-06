import math
import re
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_instructor
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.user import User
from app.schemas.course import CourseCreate, CourseListRead, CourseRead, CourseUpdate, PaginatedCourses

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
    db: AsyncSession = Depends(get_db),
) -> PaginatedCourses:
    q = select(Course)
    if status_filter:
        q = q.where(Course.status == status_filter)
    else:
        q = q.where(Course.status == "published")
    if level:
        q = q.where(Course.level == level)
    if language:
        q = q.where(Course.language == language)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    courses = result.scalars().all()

    return PaginatedCourses(
        items=[CourseListRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit),
    )


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


@router.get("/slug/{slug}", response_model=CourseRead)
async def get_course_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> CourseRead:
    result = await db.execute(select(Course).where(Course.slug == slug))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return CourseRead.model_validate(course)


@router.patch("/{course_id}", response_model=CourseRead)
async def update_course(
    course_id: uuid.UUID,
    body: CourseUpdate,
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
