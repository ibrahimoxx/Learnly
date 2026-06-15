from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_instructor
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.schemas.instructor_finances import RevenueReport, RevenueTransactionRow

router = APIRouter(prefix="/instructor/finances", tags=["instructor-finances"])

_PERIOD_DAYS = {"30d": 30, "90d": 90, "12m": 365}


@router.get("/revenue-report", response_model=RevenueReport)
@limiter.limit("30/minute")
async def get_revenue_report(
    request: Request,
    period: str = Query(default="30d", pattern="^(30d|90d|12m|all)$"),
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> RevenueReport:
    courses_result = await db.execute(select(Course).where(Course.instructor_id == instructor.id))
    courses = courses_result.scalars().all()
    course_by_id = {c.id: c for c in courses}
    currency = courses[0].currency if courses else "EUR"

    if not course_by_id:
        return RevenueReport(total_revenue_cents=0, currency=currency, transaction_count=0, transactions=[])

    query = (
        select(Enrollment)
        .options(selectinload(Enrollment.student))
        .where(Enrollment.course_id.in_(course_by_id.keys()))
        .order_by(Enrollment.created_at.desc())
    )
    if period != "all":
        since = datetime.now(timezone.utc) - timedelta(days=_PERIOD_DAYS[period])
        query = query.where(Enrollment.created_at >= since)

    result = await db.execute(query)
    enrollments = result.scalars().all()

    transactions: list[RevenueTransactionRow] = []
    total = 0
    for enrollment in enrollments:
        amount = enrollment.amount_paid_cents or 0
        if amount == 0:
            continue
        course = course_by_id[enrollment.course_id]
        transaction_type = "refund" if enrollment.status == "refunded" else "purchase"
        signed_amount = -amount if transaction_type == "refund" else amount
        total += signed_amount
        transactions.append(
            RevenueTransactionRow(
                enrollment_id=enrollment.id,
                course_id=course.id,
                course_title=course.title,
                student_name=f"{enrollment.student.first_name} {enrollment.student.last_name}".strip()
                or enrollment.student.email,
                type=transaction_type,
                amount_cents=signed_amount,
                currency=enrollment.currency or course.currency,
                created_at=enrollment.created_at,
            )
        )

    return RevenueReport(
        total_revenue_cents=total,
        currency=currency,
        transaction_count=len(transactions),
        transactions=transactions,
    )
