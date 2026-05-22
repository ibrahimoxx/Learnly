import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.coding_exercise import CodeSubmission, CodingExercise
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.section import Section
from app.db.tables.user import User
from app.schemas.coding_exercise import (
    CodeSubmissionRead,
    CodeSubmitRequest,
    CodingExerciseInstructorRead,
    CodingExerciseRead,
    CodingExerciseWrite,
    TestCaseResult,
)
from app.services import judge0

log = structlog.get_logger()
router = APIRouter(tags=["coding_exercises"])


async def _get_lesson_course(lesson_id: uuid.UUID, db: AsyncSession) -> tuple[Lesson, Course]:
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    section_result = await db.execute(select(Section).where(Section.id == lesson.section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")

    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    return lesson, course


async def _require_enrolled(course_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course_id,
            Enrollment.status.in_(["active", "completed"]),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be enrolled to access this exercise",
        )


def _require_instructor_owns(course: Course, user: User) -> None:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    if user.role == "instructor" and course.instructor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")


@router.get(
    "/lessons/{lesson_id}/exercise",
    response_model=CodingExerciseRead | CodingExerciseInstructorRead,
)
async def get_exercise(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodingExerciseRead:
    lesson, course = await _get_lesson_course(lesson_id, db)

    is_instructor = user.role in ("instructor", "admin") and (
        user.role == "admin" or course.instructor_id == user.id
    )
    if not is_instructor:
        await _require_enrolled(course.id, user, db)

    result = await db.execute(
        select(CodingExercise).where(CodingExercise.lesson_id == lesson_id)
    )
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    if is_instructor:
        return CodingExerciseInstructorRead.model_validate(exercise)
    return CodingExerciseRead.model_validate(exercise)


@router.put(
    "/lessons/{lesson_id}/exercise",
    response_model=CodingExerciseInstructorRead,
)
async def upsert_exercise(
    lesson_id: uuid.UUID,
    body: CodingExerciseWrite,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodingExerciseInstructorRead:
    lesson, course = await _get_lesson_course(lesson_id, db)
    _require_instructor_owns(course, user)

    if lesson.type != "coding_exercise":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson is not a coding_exercise type",
        )

    result = await db.execute(
        select(CodingExercise).where(CodingExercise.lesson_id == lesson_id)
    )
    exercise = result.scalar_one_or_none()

    test_cases_raw = [tc.model_dump() for tc in body.test_cases]

    if exercise:
        exercise.language_id = body.language_id
        exercise.problem_statement = body.problem_statement
        exercise.starter_code = body.starter_code
        exercise.test_cases = test_cases_raw
        exercise.updated_at = datetime.now(timezone.utc)
    else:
        exercise = CodingExercise(
            lesson_id=lesson_id,
            language_id=body.language_id,
            problem_statement=body.problem_statement,
            starter_code=body.starter_code,
            test_cases=test_cases_raw,
        )
        db.add(exercise)

    await db.commit()
    await db.refresh(exercise)
    log.info("exercise_upserted", lesson_id=str(lesson_id))
    return CodingExerciseInstructorRead.model_validate(exercise)


@router.post(
    "/lessons/{lesson_id}/exercise/submit",
    response_model=CodeSubmissionRead,
)
async def submit_exercise(
    lesson_id: uuid.UUID,
    body: CodeSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CodeSubmissionRead:
    lesson, course = await _get_lesson_course(lesson_id, db)
    await _require_enrolled(course.id, user, db)

    exercise_result = await db.execute(
        select(CodingExercise).where(CodingExercise.lesson_id == lesson_id)
    )
    exercise = exercise_result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    count_result = await db.execute(
        select(func.count()).select_from(CodeSubmission).where(
            CodeSubmission.student_id == user.id,
            CodeSubmission.lesson_id == lesson_id,
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    run_result = await judge0.run_test_cases(
        body.source_code, body.language_id, exercise.test_cases
    )

    first_result = run_result["results"][0] if run_result["results"] else {}
    submission = CodeSubmission(
        lesson_id=lesson_id,
        student_id=user.id,
        source_code=body.source_code,
        language_id=body.language_id,
        status=run_result["status"],
        stdout=first_result.get("stdout"),
        stderr=None,
        time_ms=first_result.get("time_ms"),
        memory_kb=first_result.get("memory_kb"),
        tests_passed=run_result["tests_passed"],
        tests_total=run_result["tests_total"],
        attempt_number=attempt_number,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    log.info(
        "code_submitted",
        lesson_id=str(lesson_id),
        student_id=str(user.id),
        tests_passed=run_result["tests_passed"],
        tests_total=run_result["tests_total"],
    )

    results = [
        TestCaseResult(
            index=r["index"],
            passed=r["passed"],
            stdout=r.get("stdout"),
            expected=r["expected"],
            time_ms=r.get("time_ms"),
            memory_kb=r.get("memory_kb"),
        )
        for r in run_result["results"]
    ]

    return CodeSubmissionRead(
        id=submission.id,
        lesson_id=submission.lesson_id,
        status=submission.status,
        tests_passed=submission.tests_passed,
        tests_total=submission.tests_total,
        stdout=submission.stdout,
        stderr=submission.stderr,
        time_ms=submission.time_ms,
        memory_kb=submission.memory_kb,
        attempt_number=submission.attempt_number,
        results=results,
        created_at=submission.created_at,
    )


@router.get(
    "/lessons/{lesson_id}/exercise/submissions",
    response_model=list[CodeSubmissionRead],
)
async def list_my_submissions(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CodeSubmissionRead]:
    _, course = await _get_lesson_course(lesson_id, db)
    await _require_enrolled(course.id, user, db)

    result = await db.execute(
        select(CodeSubmission)
        .where(
            CodeSubmission.student_id == user.id,
            CodeSubmission.lesson_id == lesson_id,
        )
        .order_by(CodeSubmission.attempt_number.desc())
    )
    subs = result.scalars().all()

    return [
        CodeSubmissionRead(
            id=s.id,
            lesson_id=s.lesson_id,
            status=s.status,
            tests_passed=s.tests_passed,
            tests_total=s.tests_total,
            stdout=s.stdout,
            stderr=s.stderr,
            time_ms=s.time_ms,
            memory_kb=s.memory_kb,
            attempt_number=s.attempt_number,
            results=[],
            created_at=s.created_at,
        )
        for s in subs
    ]
