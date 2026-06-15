from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.schemas.admin_revenue import AdminPayoutRow

router = APIRouter(prefix="/admin/payouts", tags=["admin-payouts"])

DEFAULT_CURRENCY = "EUR"

@router.get("", response_model=list[AdminPayoutRow])
async def list_payouts(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminPayoutRow]:
    revenue_expr = func.coalesce(func.sum(Enrollment.amount_paid_cents), 0)

    result = await db.execute(
        select(
            User.id,
            User.first_name,
            User.last_name,
            User.email,
            User.stripe_account_id,
            revenue_expr,
            func.count(func.distinct(Course.id)),
        )
        .join(Course, Course.instructor_id == User.id)
        .outerjoin(
            Enrollment,
            (Enrollment.course_id == Course.id) & (Enrollment.status != "refunded"),
        )
        .where(User.role == "instructor")
        .group_by(User.id, User.first_name, User.last_name, User.email, User.stripe_account_id)
        .order_by(revenue_expr.desc())
    )

    return [
        AdminPayoutRow(
            instructor_id=row[0],
            name=f"{row[1]} {row[2]}".strip() or row[3],
            email=row[3],
            stripe_connected=row[4] is not None,
            total_revenue_cents=row[5],
            currency=DEFAULT_CURRENCY,
            course_count=row[6],
        )
        for row in result.all()
    ]
