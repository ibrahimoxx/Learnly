import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson import Lesson
from app.db.tables.note import Note
from app.db.tables.section import Section
from app.db.tables.user import User
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate, NoteWithContext

router = APIRouter(tags=["notes"])


async def _get_lesson_course_id(db: AsyncSession, lesson_id: uuid.UUID) -> uuid.UUID | None:
    result = await db.execute(
        select(Section.course_id).join(Lesson, Lesson.section_id == Section.id).where(Lesson.id == lesson_id)
    )
    return result.scalar_one_or_none()


async def _is_enrolled(db: AsyncSession, student_id: uuid.UUID, course_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(Enrollment.id).where(Enrollment.student_id == student_id, Enrollment.course_id == course_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


@router.get("/notes", response_model=list[NoteWithContext])
@limiter.limit("60/minute")
async def list_notes(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NoteWithContext]:
    result = await db.execute(
        select(Note, Lesson.title, Course.title, Course.slug)
        .join(Lesson, Lesson.id == Note.lesson_id)
        .join(Course, Course.id == Note.course_id)
        .where(Note.student_id == user.id)
        .order_by(Note.updated_at.desc())
    )
    rows = result.all()
    return [
        NoteWithContext(
            **NoteRead.model_validate(note).model_dump(),
            lesson_title=lesson_title,
            course_title=course_title,
            course_slug=course_slug,
        )
        for note, lesson_title, course_title, course_slug in rows
    ]


@router.get("/lessons/{lesson_id}/notes", response_model=list[NoteRead])
@limiter.limit("60/minute")
async def list_lesson_notes(
    request: Request,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NoteRead]:
    result = await db.execute(
        select(Note)
        .where(Note.student_id == user.id, Note.lesson_id == lesson_id)
        .order_by(Note.timestamp_seconds.asc().nullslast(), Note.created_at.asc())
    )
    return [NoteRead.model_validate(note) for note in result.scalars().all()]


@router.post("/lessons/{lesson_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def create_note(
    request: Request,
    lesson_id: uuid.UUID,
    body: NoteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRead:
    course_id = await _get_lesson_course_id(db, lesson_id)
    if course_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    if not await _is_enrolled(db, user.id, course_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be enrolled in this course")

    note = Note(
        student_id=user.id,
        lesson_id=lesson_id,
        course_id=course_id,
        content=body.content,
        timestamp_seconds=body.timestamp_seconds,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return NoteRead.model_validate(note)


@router.patch("/notes/{note_id}", response_model=NoteRead)
@limiter.limit("30/minute")
async def update_note(
    request: Request,
    note_id: uuid.UUID,
    body: NoteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoteRead:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.student_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    note.content = body.content
    await db.commit()
    await db.refresh(note)
    return NoteRead.model_validate(note)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
async def delete_note(
    request: Request,
    note_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.student_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    await db.delete(note)
    await db.commit()
