import uuid

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.quiz import QuizAttempt, QuizQuestion
from app.db.tables.section import Section
from app.db.tables.user import User
from app.schemas.quiz import (
    QuizAttemptRead,
    QuizQuestionCreate,
    QuizQuestionInstructorRead,
    QuizQuestionRead,
    QuizQuestionResult,
    QuizQuestionUpdate,
    QuizSubmitRequest,
)

from app.services.gamification import process_quiz_pass

log = structlog.get_logger()
router = APIRouter(tags=["quiz"])


async def _run_gamification_quiz(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await process_quiz_pass(uuid.UUID(user_id), db)

PASS_THRESHOLD = 0.7


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


async def _require_instructor_owns(course: Course, user: User) -> None:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    if user.role == "instructor" and course.instructor_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this course")


async def _require_enrolled(course_id: uuid.UUID, user: User, db: AsyncSession) -> None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be enrolled to access this quiz")


def _attempt_to_read(attempt: QuizAttempt, questions: list[QuizQuestion]) -> QuizAttemptRead:
    results = [
        QuizQuestionResult(
            question_id=q.id,
            selected_index=attempt.answers[i] if i < len(attempt.answers) else None,
            correct_index=q.correct_index,
            is_correct=attempt.answers[i] == q.correct_index if i < len(attempt.answers) else False,
            explanation=q.explanation,
        )
        for i, q in enumerate(questions)
    ]
    return QuizAttemptRead(
        id=attempt.id,
        lesson_id=attempt.lesson_id,
        score=attempt.score,
        total=attempt.total,
        passed=attempt.passed,
        answers=attempt.answers,
        results=results,
        created_at=attempt.created_at,
    )


@router.get("/lessons/{lesson_id}/quiz/questions", response_model=list[QuizQuestionRead])
async def list_quiz_questions(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[QuizQuestionRead]:
    _, course = await _get_lesson_course(lesson_id, db)

    is_instructor = user.role in ("instructor", "admin") and (
        user.role == "admin" or course.instructor_id == user.id
    )
    if not is_instructor:
        await _require_enrolled(course.id, user, db)

    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.lesson_id == lesson_id)
        .order_by(QuizQuestion.position, QuizQuestion.created_at)
    )
    questions = result.scalars().all()

    if is_instructor:
        return [QuizQuestionInstructorRead.model_validate(q) for q in questions]
    return [QuizQuestionRead.model_validate(q) for q in questions]


@router.post(
    "/lessons/{lesson_id}/quiz/questions",
    response_model=QuizQuestionInstructorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_quiz_question(
    lesson_id: uuid.UUID,
    body: QuizQuestionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizQuestionInstructorRead:
    lesson, course = await _get_lesson_course(lesson_id, db)
    await _require_instructor_owns(course, user)

    if lesson.type != "quiz":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson is not a quiz type",
        )
    if len(body.options) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Need at least 2 options")
    if body.correct_index >= len(body.options):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="correct_index out of range")

    question = QuizQuestion(
        lesson_id=lesson_id,
        question_text=body.question_text,
        options=body.options,
        correct_index=body.correct_index,
        explanation=body.explanation,
        position=body.position,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    log.info("quiz_question_created", lesson_id=str(lesson_id), question_id=str(question.id))
    return QuizQuestionInstructorRead.model_validate(question)


@router.patch("/quiz/questions/{question_id}", response_model=QuizQuestionInstructorRead)
async def update_quiz_question(
    question_id: uuid.UUID,
    body: QuizQuestionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizQuestionInstructorRead:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    _, course = await _get_lesson_course(question.lesson_id, db)
    await _require_instructor_owns(course, user)

    if body.question_text is not None:
        question.question_text = body.question_text
    if body.options is not None:
        question.options = body.options
    if body.correct_index is not None:
        question.correct_index = body.correct_index
    if body.explanation is not None:
        question.explanation = body.explanation
    if body.position is not None:
        question.position = body.position

    await db.commit()
    await db.refresh(question)
    return QuizQuestionInstructorRead.model_validate(question)


@router.delete("/quiz/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_question(
    question_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    _, course = await _get_lesson_course(question.lesson_id, db)
    await _require_instructor_owns(course, user)

    await db.delete(question)
    await db.commit()
    log.info("quiz_question_deleted", question_id=str(question_id))


@router.post("/lessons/{lesson_id}/quiz/submit", response_model=QuizAttemptRead)
async def submit_quiz(
    lesson_id: uuid.UUID,
    body: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizAttemptRead:
    _, course = await _get_lesson_course(lesson_id, db)
    await _require_enrolled(course.id, user, db)

    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.lesson_id == lesson_id)
        .order_by(QuizQuestion.position, QuizQuestion.created_at)
    )
    questions = result.scalars().all()

    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No questions for this quiz")

    total = len(questions)
    answers = list(body.answers) + [None] * max(0, total - len(body.answers))
    answers = answers[:total]

    score = sum(
        1 for i, q in enumerate(questions)
        if answers[i] is not None and answers[i] == q.correct_index
    )
    passed = (score / total) >= PASS_THRESHOLD

    attempt = QuizAttempt(
        student_id=user.id,
        lesson_id=lesson_id,
        answers=answers,
        score=score,
        total=total,
        passed=passed,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    log.info("quiz_submitted", lesson_id=str(lesson_id), student_id=str(user.id), score=score, total=total)
    return _attempt_to_read(attempt, list(questions))


@router.get("/lessons/{lesson_id}/quiz/my-attempt", response_model=QuizAttemptRead)
async def get_my_quiz_attempt(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuizAttemptRead:
    _, course = await _get_lesson_course(lesson_id, db)
    await _require_enrolled(course.id, user, db)

    attempt_result = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.student_id == user.id, QuizAttempt.lesson_id == lesson_id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(1)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No attempt found")

    questions_result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.lesson_id == lesson_id)
        .order_by(QuizQuestion.position, QuizQuestion.created_at)
    )
    questions = questions_result.scalars().all()

    return _attempt_to_read(attempt, list(questions))
