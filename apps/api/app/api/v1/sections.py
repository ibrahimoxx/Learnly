import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_instructor
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.section import Section
from app.db.tables.user import User
from app.schemas.section import SectionCreate, SectionRead, SectionUpdate

log = structlog.get_logger()
router = APIRouter(prefix="/courses/{course_id}/sections", tags=["sections"])


async def _get_course_or_403(
    course_id: uuid.UUID, instructor: User, db: AsyncSession
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.instructor_id != instructor.id and instructor.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    return course


@router.get("", response_model=list[SectionRead])
async def list_sections(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[SectionRead]:
    result = await db.execute(
        select(Section).where(Section.course_id == course_id).order_by(Section.position)
    )
    return [SectionRead.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=SectionRead, status_code=status.HTTP_201_CREATED)
async def create_section(
    course_id: uuid.UUID,
    body: SectionCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> SectionRead:
    await _get_course_or_403(course_id, instructor, db)
    section = Section(course_id=course_id, **body.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return SectionRead.model_validate(section)


@router.patch("/{section_id}", response_model=SectionRead)
async def update_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    body: SectionUpdate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> SectionRead:
    await _get_course_or_403(course_id, instructor, db)
    result = await db.execute(
        select(Section).where(Section.id == section_id, Section.course_id == course_id)
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return SectionRead.model_validate(section)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> None:
    await _get_course_or_403(course_id, instructor, db)
    result = await db.execute(
        select(Section).where(Section.id == section_id, Section.course_id == course_id)
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found")
    await db.delete(section)
    await db.commit()
