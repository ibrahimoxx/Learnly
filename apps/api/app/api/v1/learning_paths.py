import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, get_optional_user, require_instructor
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.learning_path import LearningPath, LearningPathCourse, LearningPathEnrollment
from app.db.tables.user import User
from app.schemas.course import CourseListRead
from app.schemas.learning_path import (
    LearningPathCourseAdd,
    LearningPathCreate,
    LearningPathDetail,
    LearningPathProgress,
    LearningPathRead,
    LearningPathUpdate,
)

log = structlog.get_logger()
router = APIRouter(prefix="/learning-paths", tags=["learning-paths"])


async def _get_path_or_404(slug: str, db: AsyncSession) -> LearningPath:
    result = await db.execute(select(LearningPath).where(LearningPath.slug == slug))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning path not found")
    return path


def _check_owner(path: LearningPath, user: User) -> None:
    if path.instructor_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your path")


async def _path_to_read(path: LearningPath, db: AsyncSession) -> LearningPathRead:
    count_result = await db.execute(
        select(func.count()).select_from(LearningPathCourse).where(LearningPathCourse.path_id == path.id)
    )
    course_count = count_result.scalar() or 0
    read = LearningPathRead.model_validate(path)
    read.course_count = course_count
    return read


async def _path_to_detail(path: LearningPath, db: AsyncSession) -> LearningPathDetail:
    lpc_result = await db.execute(
        select(LearningPathCourse)
        .where(LearningPathCourse.path_id == path.id)
        .order_by(LearningPathCourse.position)
    )
    lpc_rows = lpc_result.scalars().all()

    courses: list[CourseListRead] = []
    for lpc in lpc_rows:
        course_result = await db.execute(select(Course).where(Course.id == lpc.course_id))
        course = course_result.scalar_one_or_none()
        if course:
            courses.append(CourseListRead.model_validate(course))

    enrolled_count_result = await db.execute(
        select(func.count()).select_from(LearningPathEnrollment).where(
            LearningPathEnrollment.path_id == path.id
        )
    )
    enrolled_count = enrolled_count_result.scalar() or 0

    detail = LearningPathDetail.model_validate(path)
    detail.course_count = len(courses)
    detail.courses = courses
    detail.enrolled_count = enrolled_count
    return detail


@router.get("", response_model=list[LearningPathRead])
async def list_paths(
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> list[LearningPathRead]:
    is_instructor = user is not None and user.role in ("instructor", "admin")
    if is_instructor:
        result = await db.execute(
            select(LearningPath)
            .where(LearningPath.instructor_id == user.id)  # type: ignore[union-attr]
            .order_by(LearningPath.created_at.desc())
        )
    else:
        result = await db.execute(
            select(LearningPath)
            .where(LearningPath.status == "published")
            .order_by(LearningPath.created_at.desc())
        )
    paths = result.scalars().all()
    return [await _path_to_read(p, db) for p in paths]


@router.post("", response_model=LearningPathRead, status_code=status.HTTP_201_CREATED)
async def create_path(
    body: LearningPathCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> LearningPathRead:
    existing = await db.execute(select(LearningPath).where(LearningPath.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")
    path = LearningPath(instructor_id=instructor.id, **body.model_dump())
    db.add(path)
    await db.commit()
    await db.refresh(path)
    return await _path_to_read(path, db)


@router.get("/my-paths", response_model=list[LearningPathDetail])
async def list_my_paths(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LearningPathDetail]:
    result = await db.execute(
        select(LearningPath)
        .join(LearningPathEnrollment, LearningPathEnrollment.path_id == LearningPath.id)
        .where(LearningPathEnrollment.student_id == user.id)
        .order_by(LearningPathEnrollment.enrolled_at.desc())
    )
    paths = result.scalars().all()
    return [await _path_to_detail(p, db) for p in paths]


@router.get("/{slug}", response_model=LearningPathDetail)
async def get_path(
    slug: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> LearningPathDetail:
    path = await _get_path_or_404(slug, db)
    is_owner = user is not None and (path.instructor_id == user.id or user.role == "admin")
    if path.status != "published" and not is_owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning path not found")
    return await _path_to_detail(path, db)


@router.patch("/{slug}", response_model=LearningPathRead)
async def update_path(
    slug: str,
    body: LearningPathUpdate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> LearningPathRead:
    path = await _get_path_or_404(slug, db)
    _check_owner(path, instructor)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(path, field, value)
    await db.commit()
    await db.refresh(path)
    return await _path_to_read(path, db)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_path(
    slug: str,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    path = await _get_path_or_404(slug, db)
    _check_owner(path, instructor)
    await db.delete(path)
    await db.commit()


@router.post("/{slug}/courses", response_model=LearningPathRead, status_code=status.HTTP_201_CREATED)
async def add_course_to_path(
    slug: str,
    body: LearningPathCourseAdd,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> LearningPathRead:
    path = await _get_path_or_404(slug, db)
    _check_owner(path, instructor)
    course_result = await db.execute(select(Course).where(Course.id == body.course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.instructor_id != instructor.id and instructor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot add courses you do not own")
    existing = await db.execute(
        select(LearningPathCourse).where(
            LearningPathCourse.path_id == path.id,
            LearningPathCourse.course_id == body.course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Course already in path")
    lpc = LearningPathCourse(path_id=path.id, course_id=body.course_id, position=body.position)
    db.add(lpc)
    await db.commit()
    return await _path_to_read(path, db)


@router.delete("/{slug}/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_course_from_path(
    slug: str,
    course_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    path = await _get_path_or_404(slug, db)
    _check_owner(path, instructor)
    result = await db.execute(
        select(LearningPathCourse).where(
            LearningPathCourse.path_id == path.id,
            LearningPathCourse.course_id == course_id,
        )
    )
    lpc = result.scalar_one_or_none()
    if not lpc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not in path")
    await db.delete(lpc)
    await db.commit()


@router.post("/{slug}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_in_path(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    path = await _get_path_or_404(slug, db)
    if path.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path not published")
    existing = await db.execute(
        select(LearningPathEnrollment).where(
            LearningPathEnrollment.student_id == user.id,
            LearningPathEnrollment.path_id == path.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already following this path")
    enrollment = LearningPathEnrollment(student_id=user.id, path_id=path.id)
    db.add(enrollment)
    await db.commit()
    return {"enrolled": True}


@router.delete("/{slug}/enroll", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_from_path(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    path = await _get_path_or_404(slug, db)
    result = await db.execute(
        select(LearningPathEnrollment).where(
            LearningPathEnrollment.student_id == user.id,
            LearningPathEnrollment.path_id == path.id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not following this path")
    await db.delete(enrollment)
    await db.commit()


@router.get("/{slug}/my-progress", response_model=LearningPathProgress)
async def get_my_progress(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LearningPathProgress:
    path = await _get_path_or_404(slug, db)

    course_ids_result = await db.execute(
        select(LearningPathCourse.course_id).where(LearningPathCourse.path_id == path.id)
    )
    course_ids = [row[0] for row in course_ids_result.all()]
    total = len(course_ids)

    completed = 0
    if course_ids:
        completed_result = await db.execute(
            select(func.count()).select_from(Enrollment).where(
                Enrollment.student_id == user.id,
                Enrollment.course_id.in_(course_ids),
                Enrollment.status == "completed",
            )
        )
        completed = completed_result.scalar() or 0

    enrolled_result = await db.execute(
        select(LearningPathEnrollment).where(
            LearningPathEnrollment.student_id == user.id,
            LearningPathEnrollment.path_id == path.id,
        )
    )
    enrolled = enrolled_result.scalar_one_or_none() is not None

    return LearningPathProgress(
        path_id=path.id,
        completed_courses=completed,
        total_courses=total,
        enrolled=enrolled,
    )
