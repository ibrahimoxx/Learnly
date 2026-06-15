import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_instructor
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.lesson_progress import LessonProgress
from app.db.tables.review import Review
from app.db.tables.user import User
from app.db.tables.wishlist import WishlistItem
from app.schemas.instructor_performance import (
    CourseRevenueRow,
    EngagementRow,
    MonthlyRevenuePoint,
    PerformanceOverview,
    StudentRow,
    TrafficRow,
)
from app.schemas.review import ReviewRead, ReviewRespond

router = APIRouter(prefix="/instructor/performance", tags=["instructor-performance"])


async def _instructor_courses(instructor: User, db: AsyncSession) -> list[Course]:
    result = await db.execute(select(Course).where(Course.instructor_id == instructor.id))
    return list(result.scalars().all())


@router.get("/overview", response_model=PerformanceOverview)
async def get_overview(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> PerformanceOverview:
    courses = await _instructor_courses(instructor, db)
    course_ids = [c.id for c in courses]
    currency = courses[0].currency if courses else "EUR"

    if not course_ids:
        return PerformanceOverview(
            total_revenue_cents=0,
            currency=currency,
            total_students=0,
            total_courses=0,
            average_rating=0.0,
            monthly_revenue=[],
            courses=[],
        )

    revenue_result = await db.execute(
        select(
            Enrollment.course_id,
            func.coalesce(func.sum(Enrollment.amount_paid_cents), 0),
            func.count(func.distinct(Enrollment.student_id)),
        )
        .where(Enrollment.course_id.in_(course_ids), Enrollment.status != "refunded")
        .group_by(Enrollment.course_id)
    )
    revenue_by_course = {row[0]: (row[1], row[2]) for row in revenue_result.all()}

    students_result = await db.execute(
        select(func.count(func.distinct(Enrollment.student_id))).where(
            Enrollment.course_id.in_(course_ids), Enrollment.status != "refunded"
        )
    )
    total_students = students_result.scalar_one()

    since = datetime.now(timezone.utc) - timedelta(days=365)
    monthly_result = await db.execute(
        select(
            func.to_char(func.date_trunc("month", Enrollment.created_at), "YYYY-MM"),
            func.coalesce(func.sum(Enrollment.amount_paid_cents), 0),
        )
        .where(
            Enrollment.course_id.in_(course_ids),
            Enrollment.status != "refunded",
            Enrollment.created_at >= since,
        )
        .group_by(func.date_trunc("month", Enrollment.created_at))
        .order_by(func.date_trunc("month", Enrollment.created_at))
    )
    monthly_revenue = [MonthlyRevenuePoint(month=row[0], revenue_cents=row[1]) for row in monthly_result.all()]

    total_revenue_cents = sum(rev for rev, _ in revenue_by_course.values())
    rated_courses = [c for c in courses if c.review_count > 0]
    average_rating = (
        sum(float(c.rating) * c.review_count for c in rated_courses) / sum(c.review_count for c in rated_courses)
        if rated_courses
        else 0.0
    )

    course_rows = [
        CourseRevenueRow(
            course_id=c.id,
            title=c.title,
            enrollment_count=revenue_by_course.get(c.id, (0, 0))[1],
            revenue_cents=revenue_by_course.get(c.id, (0, 0))[0],
            currency=c.currency,
            rating=float(c.rating),
            review_count=c.review_count,
        )
        for c in courses
    ]

    return PerformanceOverview(
        total_revenue_cents=total_revenue_cents,
        currency=currency,
        total_students=total_students,
        total_courses=len(courses),
        average_rating=round(average_rating, 2),
        monthly_revenue=monthly_revenue,
        courses=course_rows,
    )


@router.get("/students", response_model=list[StudentRow])
async def get_students(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[StudentRow]:
    courses = await _instructor_courses(instructor, db)
    course_by_id = {c.id: c for c in courses}
    if not course_by_id:
        return []

    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.student))
        .where(Enrollment.course_id.in_(course_by_id.keys()))
        .order_by(Enrollment.created_at.desc())
    )
    enrollments = result.scalars().all()

    rows: list[StudentRow] = []
    for enrollment in enrollments:
        course = course_by_id[enrollment.course_id]
        progress_result = await db.execute(
            select(
                func.count(LessonProgress.id).filter(LessonProgress.is_completed.is_(True)),
                func.max(LessonProgress.updated_at),
            ).where(LessonProgress.enrollment_id == enrollment.id)
        )
        completed_count, last_activity = progress_result.one()
        progress_percent = (
            round((completed_count / course.total_lessons) * 100, 1) if course.total_lessons > 0 else 0.0
        )
        student = enrollment.student
        rows.append(
            StudentRow(
                student_id=student.id,
                name=f"{student.first_name} {student.last_name}".strip() or student.email,
                email=student.email,
                course_id=course.id,
                course_title=course.title,
                enrolled_at=enrollment.created_at,
                progress_percent=progress_percent,
                last_activity_at=last_activity,
            )
        )
    return rows


@router.get("/reviews", response_model=list[ReviewRead])
async def get_reviews(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[ReviewRead]:
    courses = await _instructor_courses(instructor, db)
    course_by_id = {c.id: c for c in courses}
    if not course_by_id:
        return []

    result = await db.execute(
        select(Review)
        .options(selectinload(Review.student))
        .where(Review.course_id.in_(course_by_id.keys()))
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
            course_title=course_by_id[r.course_id].title,
            instructor_response=r.instructor_response,
            instructor_response_at=r.instructor_response_at,
            created_at=r.created_at,
        )
        for r in reviews
    ]


@router.post("/reviews/{review_id}/respond", response_model=ReviewRead)
async def respond_to_review(
    review_id: uuid.UUID,
    body: ReviewRespond,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    result = await db.execute(
        select(Review).options(selectinload(Review.student)).where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    course_result = await db.execute(select(Course).where(Course.id == review.course_id))
    course = course_result.scalar_one_or_none()
    if not course or course.instructor_id != instructor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")

    review.instructor_response = body.response
    review.instructor_response_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(review)

    return ReviewRead(
        id=review.id,
        course_id=review.course_id,
        student_id=review.student_id,
        rating=review.rating,
        comment=review.comment,
        student_name=f"{review.student.first_name} {review.student.last_name}".strip() or review.student.email,
        course_title=course.title,
        instructor_response=review.instructor_response,
        instructor_response_at=review.instructor_response_at,
        created_at=review.created_at,
    )


@router.get("/engagement", response_model=list[EngagementRow])
async def get_engagement(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[EngagementRow]:
    courses = await _instructor_courses(instructor, db)
    if not courses:
        return []

    rows: list[EngagementRow] = []
    for course in courses:
        enrollments_result = await db.execute(
            select(Enrollment).where(Enrollment.course_id == course.id, Enrollment.status != "refunded")
        )
        enrollments = enrollments_result.scalars().all()
        total_students = len(enrollments)
        completed_students = sum(1 for e in enrollments if e.status == "completed")

        if enrollments:
            watch_result = await db.execute(
                select(
                    func.coalesce(func.sum(LessonProgress.watched_seconds), 0),
                    func.count(LessonProgress.id).filter(LessonProgress.is_completed.is_(True)),
                ).where(LessonProgress.enrollment_id.in_([e.id for e in enrollments]))
            )
            total_watched_seconds, total_completed_lessons = watch_result.one()
        else:
            total_watched_seconds, total_completed_lessons = 0, 0

        average_progress_percent = (
            round((total_completed_lessons / (total_students * course.total_lessons)) * 100, 1)
            if total_students > 0 and course.total_lessons > 0
            else 0.0
        )
        completion_rate = round((completed_students / total_students) * 100, 1) if total_students > 0 else 0.0

        rows.append(
            EngagementRow(
                course_id=course.id,
                title=course.title,
                total_students=total_students,
                completed_students=completed_students,
                completion_rate=completion_rate,
                total_watch_minutes=total_watched_seconds // 60,
                average_progress_percent=average_progress_percent,
            )
        )
    return rows


@router.get("/traffic", response_model=list[TrafficRow])
async def get_traffic(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[TrafficRow]:
    courses = await _instructor_courses(instructor, db)
    if not courses:
        return []

    course_ids = [c.id for c in courses]
    wishlist_result = await db.execute(
        select(WishlistItem.course_id, func.count(WishlistItem.id))
        .where(WishlistItem.course_id.in_(course_ids))
        .group_by(WishlistItem.course_id)
    )
    wishlist_by_course = dict(wishlist_result.all())

    rows: list[TrafficRow] = []
    for course in courses:
        wishlist_count = wishlist_by_course.get(course.id, 0)
        enrollment_count = course.enrollment_count
        denom = enrollment_count + wishlist_count
        conversion_rate = round((enrollment_count / denom) * 100, 1) if denom > 0 else 0.0
        rows.append(
            TrafficRow(
                course_id=course.id,
                title=course.title,
                wishlist_count=wishlist_count,
                enrollment_count=enrollment_count,
                conversion_rate=conversion_rate,
            )
        )
    return rows
