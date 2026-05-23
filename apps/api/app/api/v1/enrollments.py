import asyncio
import json
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import AsyncSessionLocal, get_db
from app.services.gamification import process_course_completion, process_lesson_completion
from app.db.tables.affiliate import AffiliateConversion, AffiliateLink
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


async def _run_gamification_lesson(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await process_lesson_completion(uuid.UUID(user_id), db)


async def _run_gamification_course(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await process_course_completion(uuid.UUID(user_id), db)


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

    if body.affiliate_code:
        link_result = await db.execute(
            select(AffiliateLink).where(
                AffiliateLink.code == body.affiliate_code.upper(),
                AffiliateLink.is_active == True,  # noqa: E712
            )
        )
        aff_link = link_result.scalar_one_or_none()
        if aff_link and aff_link.instructor_id != user.id:
            db.add(AffiliateConversion(
                link_id=aff_link.id,
                enrollment_id=enrollment.id,
                course_id=enrollment.course_id,
                student_id=user.id,
                amount_cents=0,
                commission_cents=0,
            ))
            await db.commit()

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
    enrollments = result.scalars().all()
    if not enrollments:
        return []

    enrollment_ids = [e.id for e in enrollments]
    course_ids = list({e.course_id for e in enrollments})

    courses_result = await db.execute(select(Course).where(Course.id.in_(course_ids)))
    courses_by_id = {c.id: c for c in courses_result.scalars().all()}

    total_result = await db.execute(
        select(Section.course_id, func.count(Lesson.id).label("cnt"))
        .join(Lesson, Lesson.section_id == Section.id)
        .where(Section.course_id.in_(course_ids))
        .group_by(Section.course_id)
    )
    total_by_course = {row.course_id: row.cnt for row in total_result}

    completed_result = await db.execute(
        select(LessonProgress.enrollment_id, func.count(LessonProgress.id).label("cnt"))
        .where(
            LessonProgress.enrollment_id.in_(enrollment_ids),
            LessonProgress.is_completed == True,  # noqa: E712
        )
        .group_by(LessonProgress.enrollment_id)
    )
    completed_by_enrollment = {row.enrollment_id: row.cnt for row in completed_result}

    return [
        EnrollmentRead(
            id=e.id,
            student_id=e.student_id,
            course_id=e.course_id,
            course_title=courses_by_id[e.course_id].title if e.course_id in courses_by_id else "",
            course_slug=courses_by_id[e.course_id].slug if e.course_id in courses_by_id else "",
            status=e.status,
            completed_at=e.completed_at,
            created_at=e.created_at,
            total_lessons=total_by_course.get(e.course_id, 0),
            completed_lessons=completed_by_enrollment.get(e.id, 0),
        )
        for e in enrollments
    ]


@router.post("/enrollments/{enrollment_id}/progress", response_model=ProgressRead)
async def upsert_progress(
    enrollment_id: uuid.UUID,
    body: ProgressUpdate,
    background_tasks: BackgroundTasks,
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

    newly_completed = False
    if progress:
        progress.watched_seconds = max(progress.watched_seconds, body.watched_seconds)
        progress.last_position_seconds = body.last_position_seconds
        if body.is_completed and not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.now(timezone.utc)
            newly_completed = True
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
        newly_completed = body.is_completed

    await db.commit()

    if newly_completed:
        background_tasks.add_task(_run_gamification_lesson, str(user.id))

    # Check 100% completion
    await _check_course_completion(enrollment, db, background_tasks)

    await db.refresh(progress)

    try:
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        await r.publish(f"progress:{enrollment_id}", json.dumps({
            "lesson_id": str(body.lesson_id),
            "is_completed": progress.is_completed,
            "watched_seconds": progress.watched_seconds,
            "last_position_seconds": progress.last_position_seconds,
            "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
        }))
        await r.aclose()
    except Exception:
        pass  # Redis failure must not break progress save

    return ProgressRead.model_validate(progress)


@router.get("/enrollments/{enrollment_id}/progress", response_model=list[ProgressRead])
async def list_progress(
    enrollment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProgressRead]:
    enrollment_result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id, Enrollment.student_id == user.id)
    )
    if not enrollment_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    result = await db.execute(
        select(LessonProgress).where(LessonProgress.enrollment_id == enrollment_id)
    )
    return [ProgressRead.model_validate(p) for p in result.scalars().all()]


@router.get("/enrollments/{enrollment_id}/progress/stream")
async def stream_progress(
    enrollment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    enrollment_result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id, Enrollment.student_id == user.id)
    )
    if not enrollment_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    async def event_generator():
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(f"progress:{enrollment_id}")
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
        finally:
            await pubsub.unsubscribe(f"progress:{enrollment_id}")
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _check_course_completion(enrollment: Enrollment, db: AsyncSession, background_tasks: BackgroundTasks | None = None) -> None:
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
        if background_tasks:
            background_tasks.add_task(_run_gamification_course, str(enrollment.student_id))


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
