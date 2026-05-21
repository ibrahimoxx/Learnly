import uuid

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.schemas.course import CourseListRead
from app.services.embeddings import _run_embed

log = structlog.get_logger()
router = APIRouter(tags=["recommendations"])


@router.get("/recommendations", response_model=list[CourseListRead])
async def get_recommendations(
    limit: int = Query(6, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CourseListRead]:
    user_id = uuid.UUID(str(user.id))

    enrolled_result = await db.execute(
        select(Enrollment.course_id).where(
            Enrollment.student_id == user_id,
            Enrollment.status.in_(["active", "completed"]),
        )
    )
    enrolled_ids: list[uuid.UUID] = [row[0] for row in enrolled_result]

    courses = await _vector_recommendations(user_id, enrolled_ids, limit, db)
    if not courses:
        courses = await _fallback_recommendations(enrolled_ids, limit, db)

    return [CourseListRead.model_validate(c) for c in courses]


async def _vector_recommendations(
    user_id: uuid.UUID,
    enrolled_ids: list[uuid.UUID],
    limit: int,
    db: AsyncSession,
) -> list[Course]:
    if not enrolled_ids:
        return []

    embed_result = await db.execute(
        select(Course.embedding).where(
            Course.id.in_(enrolled_ids),
            Course.embedding.is_not(None),
        )
    )
    embeddings = [row[0] for row in embed_result if row[0] is not None]
    if not embeddings:
        return []

    dim = len(embeddings[0])
    avg: list[float] = [
        sum(e[i] for e in embeddings) / len(embeddings) for i in range(dim)
    ]

    exclude = enrolled_ids if enrolled_ids else [uuid.uuid4()]
    query = (
        select(Course)
        .where(
            Course.status == "published",
            Course.id.not_in(exclude),
            Course.embedding.is_not(None),
        )
        .order_by(Course.embedding.cosine_distance(avg))  # type: ignore[attr-defined]
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def _fallback_recommendations(
    enrolled_ids: list[uuid.UUID],
    limit: int,
    db: AsyncSession,
) -> list[Course]:
    exclude = enrolled_ids if enrolled_ids else [uuid.uuid4()]
    query = (
        select(Course)
        .where(
            Course.status == "published",
            Course.id.not_in(exclude),
        )
        .order_by(Course.rating.desc(), Course.enrollment_count.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/recommendations/embed-all", status_code=status.HTTP_204_NO_CONTENT)
async def embed_all_courses(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Course.id).where(Course.status == "published")
    )
    course_ids = [str(row[0]) for row in result]
    for course_id in course_ids:
        await _run_embed(course_id)
    log.info("embed_all_complete", count=len(course_ids))
