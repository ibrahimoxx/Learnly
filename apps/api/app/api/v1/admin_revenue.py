from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.schemas.admin_revenue import (
    AdminRevenueReport,
    MonthlyRevenuePoint,
    TopCourseRevenue,
    TopInstructorRevenue,
)

router = APIRouter(prefix="/admin/revenue", tags=["admin-revenue"])

DEFAULT_CURRENCY = "EUR"

@router.get("", response_model=AdminRevenueReport)
async def get_revenue_report(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminRevenueReport:
    revenue_expr = func.coalesce(func.sum(Enrollment.amount_paid_cents), 0)

    totals_result = await db.execute(
        select(revenue_expr, func.count(Enrollment.id)).where(Enrollment.status != "refunded")
    )
    total_revenue_cents, transaction_count = totals_result.one()

    since = datetime.now(timezone.utc) - timedelta(days=365)
    month_bucket = func.date_trunc("month", Enrollment.created_at)
    monthly_result = await db.execute(
        select(month_bucket, revenue_expr)
        .where(Enrollment.status != "refunded", Enrollment.created_at >= since)
        .group_by(month_bucket)
        .order_by(month_bucket)
    )
    monthly_revenue = [
        MonthlyRevenuePoint(month=row[0].strftime("%Y-%m"), revenue_cents=row[1]) for row in monthly_result.all()
    ]

    top_courses_result = await db.execute(
        select(
            Course.id,
            Course.title,
            User.first_name,
            User.last_name,
            revenue_expr,
            func.count(Enrollment.id),
        )
        .join(Enrollment, Enrollment.course_id == Course.id)
        .join(User, User.id == Course.instructor_id)
        .where(Enrollment.status != "refunded")
        .group_by(Course.id, Course.title, User.first_name, User.last_name)
        .order_by(revenue_expr.desc())
        .limit(10)
    )
    top_courses = [
        TopCourseRevenue(
            course_id=row[0],
            title=row[1],
            instructor_name=f"{row[2]} {row[3]}".strip(),
            revenue_cents=row[4],
            enrollment_count=row[5],
        )
        for row in top_courses_result.all()
    ]

    top_instructors_result = await db.execute(
        select(
            User.id,
            User.first_name,
            User.last_name,
            User.email,
            revenue_expr,
            func.count(func.distinct(Course.id)),
        )
        .join(Course, Course.instructor_id == User.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(Enrollment.status != "refunded")
        .group_by(User.id, User.first_name, User.last_name, User.email)
        .order_by(revenue_expr.desc())
        .limit(10)
    )
    top_instructors = [
        TopInstructorRevenue(
            instructor_id=row[0],
            name=f"{row[1]} {row[2]}".strip() or row[3],
            email=row[3],
            revenue_cents=row[4],
            course_count=row[5],
        )
        for row in top_instructors_result.all()
    ]

    return AdminRevenueReport(
        total_revenue_cents=total_revenue_cents,
        currency=DEFAULT_CURRENCY,
        transaction_count=transaction_count,
        monthly_revenue=monthly_revenue,
        top_courses=top_courses,
        top_instructors=top_instructors,
    )
