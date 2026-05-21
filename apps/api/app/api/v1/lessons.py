import uuid

import arq
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_instructor
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.lesson import Lesson
from app.db.tables.section import Section
from app.db.tables.user import User
from app.integrations.storage import get_upload_url
from app.schemas.lesson import LessonCreate, LessonRead, LessonUpdate, VideoUploadURL

log = structlog.get_logger()
router = APIRouter(prefix="/sections/{section_id}/lessons", tags=["lessons"])


async def _verify_section_ownership(
    section_id: uuid.UUID, instructor: User, db: AsyncSession
) -> Section:
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()
    if not course or (course.instructor_id != instructor.id and instructor.role != "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    return section


@router.get("", response_model=list[LessonRead])
async def list_lessons(
    section_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[LessonRead]:
    result = await db.execute(
        select(Lesson).where(Lesson.section_id == section_id).order_by(Lesson.position)
    )
    return [LessonRead.model_validate(l) for l in result.scalars().all()]


@router.post("", response_model=LessonRead, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    section_id: uuid.UUID,
    body: LessonCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> LessonRead:
    await _verify_section_ownership(section_id, instructor, db)
    lesson = Lesson(section_id=section_id, **body.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return LessonRead.model_validate(lesson)


@router.patch("/{lesson_id}", response_model=LessonRead)
async def update_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    body: LessonUpdate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> LessonRead:
    await _verify_section_ownership(section_id, instructor, db)
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.section_id == section_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    await db.commit()
    await db.refresh(lesson)
    return LessonRead.model_validate(lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    await _verify_section_ownership(section_id, instructor, db)
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.section_id == section_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    await db.delete(lesson)
    await db.commit()


@router.post("/{lesson_id}/upload-url", response_model=VideoUploadURL)
async def get_video_upload_url(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> VideoUploadURL:
    await _verify_section_ownership(section_id, instructor, db)
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.section_id == section_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    key = f"videos/{lesson_id}.mp4"
    upload_url = await get_upload_url(key)
    try:
        redis = await arq.create_pool(arq.connections.RedisSettings.from_dsn(settings.redis_url))
        await redis.enqueue_job("encode_video", lesson_id=str(lesson_id), key=key)
        await redis.aclose()
    except Exception:
        log.warning("arq_enqueue_failed", lesson_id=str(lesson_id))
    return VideoUploadURL(upload_url=upload_url, key=key)
