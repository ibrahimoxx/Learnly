import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user, require_instructor
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.assignment_submission import AssignmentSubmission
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.notification import Notification
from app.db.tables.section import Section
from app.db.tables.user import User
from app.schemas.assignment import (
    AssignmentGrade,
    AssignmentSubmissionCreate,
    AssignmentSubmissionRead,
    AssignmentSubmissionWithContext,
)

router = APIRouter(tags=["assignments"])


async def _get_lesson_with_course(db: AsyncSession, lesson_id: uuid.UUID) -> tuple[Lesson, uuid.UUID] | None:
    result = await db.execute(
        select(Lesson, Section.course_id)
        .join(Section, Section.id == Lesson.section_id)
        .where(Lesson.id == lesson_id)
    )
    return result.one_or_none()


async def _is_enrolled(db: AsyncSession, student_id: uuid.UUID, course_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(Enrollment.id).where(Enrollment.student_id == student_id, Enrollment.course_id == course_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


@router.get("/lessons/{lesson_id}/assignment", response_model=AssignmentSubmissionRead | None)
@limiter.limit("60/minute")
async def get_my_submission(
    request: Request,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssignmentSubmissionRead | None:
    lesson_row = await _get_lesson_with_course(db, lesson_id)
    if lesson_row is None or lesson_row[0].type != "assignment":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, course_id = lesson_row

    if not await _is_enrolled(db, user.id, course_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be enrolled in this course")

    result = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.lesson_id == lesson_id, AssignmentSubmission.student_id == user.id
        )
    )
    submission = result.scalar_one_or_none()
    return AssignmentSubmissionRead.model_validate(submission) if submission else None


@router.put("/lessons/{lesson_id}/assignment", response_model=AssignmentSubmissionRead)
@limiter.limit("20/minute")
async def submit_assignment(
    request: Request,
    lesson_id: uuid.UUID,
    body: AssignmentSubmissionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssignmentSubmissionRead:
    if not body.content and not body.file_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide content or a file")

    lesson_row = await _get_lesson_with_course(db, lesson_id)
    if lesson_row is None or lesson_row[0].type != "assignment":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, course_id = lesson_row

    if not await _is_enrolled(db, user.id, course_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be enrolled in this course")

    result = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.lesson_id == lesson_id, AssignmentSubmission.student_id == user.id
        )
    )
    submission = result.scalar_one_or_none()
    if submission:
        submission.content = body.content
        submission.file_url = body.file_url
        submission.status = "submitted"
        submission.grade = None
        submission.feedback = None
        submission.reviewed_at = None
    else:
        submission = AssignmentSubmission(
            lesson_id=lesson_id,
            student_id=user.id,
            course_id=course_id,
            content=body.content,
            file_url=body.file_url,
        )
        db.add(submission)

    # Notify instructor
    course_row = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if course_row:
        student_name = f"{user.first_name} {user.last_name}".strip() or user.email
        db.add(Notification(
            user_id=course_row.instructor_id,
            type="assignment_submitted",
            title="New assignment submission",
            body=f"{student_name} submitted an assignment in {course_row.title}",
            link="/instructor/communication/assignments",
        ))

    await db.commit()
    await db.refresh(submission)
    return AssignmentSubmissionRead.model_validate(submission)


@router.get("/instructor/assignments", response_model=list[AssignmentSubmissionWithContext])
@limiter.limit("60/minute")
async def list_submissions(
    request: Request,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[AssignmentSubmissionWithContext]:
    result = await db.execute(
        select(AssignmentSubmission, Lesson.title, Course.title)
        .join(Course, Course.id == AssignmentSubmission.course_id)
        .join(Lesson, Lesson.id == AssignmentSubmission.lesson_id)
        .options(selectinload(AssignmentSubmission.student))
        .where(Course.instructor_id == instructor.id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    rows = result.all()
    return [
        AssignmentSubmissionWithContext(
            **AssignmentSubmissionRead.model_validate(submission).model_dump(),
            student_name=f"{submission.student.first_name} {submission.student.last_name}".strip()
            or submission.student.email,
            student_email=submission.student.email,
            lesson_title=lesson_title,
            course_title=course_title,
        )
        for submission, lesson_title, course_title in rows
    ]


@router.post("/instructor/assignments/{submission_id}/grade", response_model=AssignmentSubmissionRead)
@limiter.limit("30/minute")
async def grade_submission(
    request: Request,
    submission_id: uuid.UUID,
    body: AssignmentGrade,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> AssignmentSubmissionRead:
    result = await db.execute(
        select(AssignmentSubmission, Course)
        .join(Course, Course.id == AssignmentSubmission.course_id)
        .where(AssignmentSubmission.id == submission_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    submission, course = row
    if course.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")

    submission.grade = body.grade
    submission.feedback = body.feedback
    submission.status = "reviewed"
    submission.reviewed_at = datetime.now(timezone.utc)

    db.add(
        Notification(
            user_id=submission.student_id,
            type="assignment_graded",
            title="Your assignment was reviewed",
            body=f"You received feedback on your submission for {course.title}",
            link=f"/learn/{course.id}/{submission.lesson_id}",
        )
    )

    await db.commit()
    await db.refresh(submission)
    return AssignmentSubmissionRead.model_validate(submission)
