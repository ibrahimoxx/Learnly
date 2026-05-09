import uuid
from decimal import Decimal

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.review import Review
from app.db.tables.user import User
from app.schemas.review import ReviewCreate, ReviewRead

log = structlog.get_logger()
router = APIRouter(tags=["reviews"])


@router.get("/courses/{course_id}/reviews", response_model=list[ReviewRead])
async def list_reviews(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ReviewRead]:
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.student))
        .where(Review.course_id == course_id)
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [
        ReviewRead(
            id=r.id,
            course_id=r.course_id,
            student_id=r.student_id,
            rating=r.rating,
            comment=r.comment,
            student_name=f"{r.student.first_name} {r.student.last_name}".strip() or r.student.email,
            created_at=r.created_at,
        )
        for r in reviews
    ]


@router.post("/courses/{course_id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    course_id: uuid.UUID,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    # Must be enrolled
    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course_id,
        )
    )
    if not enrollment_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be enrolled to review")

    # One review per student per course
    existing = await db.execute(
        select(Review).where(Review.course_id == course_id, Review.student_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reviewed this course")

    review = Review(
        course_id=course_id,
        student_id=user.id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    await db.flush()

    # Recalculate course rating + count
    stats = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.course_id == course_id)
    )
    avg_rating, count = stats.one()

    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if course:
        course.rating = Decimal(str(round(float(avg_rating or 0), 2)))
        course.review_count = count

    await db.commit()
    await db.refresh(review)

    student_name = f"{user.first_name} {user.last_name}".strip() or user.email
    log.info("review_created", course_id=str(course_id), student_id=str(user.id), rating=body.rating)

    return ReviewRead(
        id=review.id,
        course_id=review.course_id,
        student_id=review.student_id,
        rating=review.rating,
        comment=review.comment,
        student_name=student_name,
        created_at=review.created_at,
    )
