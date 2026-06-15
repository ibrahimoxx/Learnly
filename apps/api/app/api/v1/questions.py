import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.notification import Notification
from app.db.tables.question import Answer, Question
from app.db.tables.user import User
from app.schemas.question import AnswerCreate, AnswerRead, QuestionCreate, QuestionRead

log = structlog.get_logger()
router = APIRouter(tags=["q&a"])


def _question_to_read(q: Question) -> QuestionRead:
    student_name = f"{q.student.first_name} {q.student.last_name}".strip() or q.student.email
    return QuestionRead(
        id=q.id,
        lesson_id=q.lesson_id,
        student_id=q.student_id,
        student_name=student_name,
        body=q.body,
        created_at=q.created_at,
        answers=[
            AnswerRead(
                id=a.id,
                question_id=a.question_id,
                user_id=a.user_id,
                user_name=f"{a.user.first_name} {a.user.last_name}".strip() or a.user.email,
                body=a.body,
                created_at=a.created_at,
            )
            for a in q.answers
        ],
    )


@router.get("/lessons/{lesson_id}/questions", response_model=list[QuestionRead])
async def list_questions(
    lesson_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[QuestionRead]:
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.student), selectinload(Question.answers).selectinload(Answer.user))
        .where(Question.lesson_id == lesson_id)
        .order_by(Question.created_at.desc())
    )
    return [_question_to_read(q) for q in result.scalars().all()]


@router.post("/lessons/{lesson_id}/questions", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    lesson_id: uuid.UUID,
    body: QuestionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QuestionRead:
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    from app.db.tables.course import Course
    from app.db.tables.section import Section
    section_result = await db.execute(select(Section).where(Section.id == lesson.section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")

    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == section.course_id,
        )
    )
    if not enrollment_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be enrolled to ask questions")

    question = Question(lesson_id=lesson_id, student_id=user.id, body=body.body)
    db.add(question)
    await db.flush()

    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()
    if course and course.instructor_id != user.id:
        asker_name = f"{user.first_name} {user.last_name}".strip() or user.email
        db.add(Notification(
            user_id=course.instructor_id,
            type="new_question",
            title="New Q&A question",
            body=f"{asker_name} asked: {body.body[:180]}",
            link=f"/instructor/communication/qa",
        ))

    await db.refresh(question, ["student", "answers"])
    await db.commit()

    log.info("question_created", lesson_id=str(lesson_id), student_id=str(user.id))
    return _question_to_read(question)


@router.post("/questions/{question_id}/answers", response_model=AnswerRead, status_code=status.HTTP_201_CREATED)
async def create_answer(
    question_id: uuid.UUID,
    body: AnswerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnswerRead:
    question_result = await db.execute(
        select(Question)
        .options(selectinload(Question.student))
        .where(Question.id == question_id)
    )
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    answer = Answer(question_id=question_id, user_id=user.id, body=body.body)
    db.add(answer)
    await db.flush()

    if question.student_id != user.id:
        answerer_name = f"{user.first_name} {user.last_name}".strip() or user.email
        db.add(Notification(
            user_id=question.student_id,
            type="qa_answer",
            title="Your question got an answer",
            body=f"{answerer_name}: {body.body[:200]}",
            link=f"/learn",
        ))

    await db.refresh(answer, ["user"])
    await db.commit()

    log.info("answer_created", question_id=str(question_id), user_id=str(user.id))
    return AnswerRead(
        id=answer.id,
        question_id=answer.question_id,
        user_id=answer.user_id,
        user_name=f"{answer.user.first_name} {answer.user.last_name}".strip() or answer.user.email,
        body=answer.body,
        created_at=answer.created_at,
    )
