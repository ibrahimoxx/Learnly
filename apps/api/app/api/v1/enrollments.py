import asyncio
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.lesson_progress import LessonProgress
from app.db.tables.section import Section
from app.db.tables.user import User
from app.email import service as email_service
from app.schemas.enrollment import EnrollmentCreate, EnrollmentRead, ProgressRead, ProgressUpdate
from app.services.certificate import generate_certificate_pdf

log = structlog.get_logger()
router = APIRouter(tags=["enrollments"])


@router.post("/enrollments", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
async def enroll(
    body: EnrollmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentRead:
    course_result = await db.execute(select(Course).where(Course.id == body.course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not published")
    if not course.is_free:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Paid course — use checkout")

    existing = await db.execute(
        select(Enrollment).where(Enrollment.student_id == user.id, Enrollment.course_id == body.course_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")

    enrollment = Enrollment(student_id=user.id, course_id=body.course_id)
    db.add(enrollment)
    course.enrollment_count = (course.enrollment_count or 0) + 1
    await db.commit()
    await db.refresh(enrollment)
    log.info("enrollment_created", user_id=str(user.id), course_id=str(body.course_id))

    # Send confirmation email in background (non-blocking)
    asyncio.get_event_loop().run_in_executor(
        None,
        email_service.send_enrollment_confirmation,
        user.email,
        user.first_name or "there",
        course.title,
        str(body.course_id),
    )

    return EnrollmentRead.model_validate(enrollment)


@router.get("/enrollments", response_model=list[EnrollmentRead])
async def my_enrollments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[EnrollmentRead]:
    result = await db.execute(select(Enrollment).where(Enrollment.student_id == user.id))
    return [EnrollmentRead.model_validate(e) for e in result.scalars().all()]


@router.post("/enrollments/{enrollment_id}/progress", response_model=ProgressRead)
async def upsert_progress(
    enrollment_id: uuid.UUID,
    body: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgressRead:
    enrollment_result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id, Enrollment.student_id == user.id)
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    progress_result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment_id,
            LessonProgress.lesson_id == body.lesson_id,
        )
    )
    progress = progress_result.scalar_one_or_none()

    if progress:
        progress.watched_seconds = max(progress.watched_seconds, body.watched_seconds)
        progress.last_position_seconds = body.last_position_seconds
        if body.is_completed and not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.now(timezone.utc)
    else:
        progress = LessonProgress(
            enrollment_id=enrollment_id,
            lesson_id=body.lesson_id,
            watched_seconds=body.watched_seconds,
            last_position_seconds=body.last_position_seconds,
            is_completed=body.is_completed,
            completed_at=datetime.now(timezone.utc) if body.is_completed else None,
        )
        db.add(progress)

    await db.commit()

    # Check 100% completion
    await _check_course_completion(enrollment, db)

    await db.refresh(progress)
    return ProgressRead.model_validate(progress)


async def _check_course_completion(enrollment: Enrollment, db: AsyncSession) -> None:
    total_result = await db.execute(
        select(func.count(Lesson.id))
        .join(Section, Lesson.section_id == Section.id)
        .where(Section.course_id == enrollment.course_id)
    )
    total_lessons = total_result.scalar_one()
    if total_lessons == 0:
        return

    completed_result = await db.execute(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.is_completed == True,  # noqa: E712
        )
    )
    completed = completed_result.scalar_one()

    if completed >= total_lessons and enrollment.status != "completed":
        enrollment.status = "completed"
        enrollment.completed_at = datetime.now(timezone.utc)
        await db.commit()
        log.info("course_completed", enrollment_id=str(enrollment.id))


@router.get("/enrollments/{enrollment_id}/certificate")
async def download_certificate(
    enrollment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course), selectinload(Enrollment.student))
        .where(Enrollment.id == enrollment_id, Enrollment.student_id == user.id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    if enrollment.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not completed")

    course_result = await db.execute(
        select(Course).where(Course.id == enrollment.course_id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    instructor_result = await db.execute(
        select(User).where(User.id == course.instructor_id)
    )
    instructor = instructor_result.scalar_one_or_none()

    student_name = f"{user.first_name} {user.last_name}".strip() or user.email
    instructor_name = (
        f"{instructor.first_name} {instructor.last_name}".strip() if instructor else "Learnly"
    )
    completion_date = (enrollment.completed_at or datetime.now(timezone.utc)).date()

    pdf = generate_certificate_pdf(
        student_name=student_name,
        course_title=course.title,
        instructor_name=instructor_name,
        completion_date=completion_date,
        enrollment_id=str(enrollment_id),
    )

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="certificate-{enrollment_id}.pdf"'},
    )
