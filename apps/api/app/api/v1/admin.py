import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.affiliate import AffiliateConversion, AffiliateLink
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.notification import Notification
from app.db.tables.support_ticket import SupportTicket
from app.db.tables.user import User

router = APIRouter(prefix="/admin", tags=["admin"])
DEFAULT_CURRENCY = "EUR"
OPEN_SUPPORT_STATUSES = ("open", "in_progress")


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return user


# ── Overview ──────────────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    month: str
    value: int


class RevenueTrendPoint(BaseModel):
    month: str
    revenue_cents: int


class RoleBreakdown(BaseModel):
    role: str
    count: int


class CourseStatusBreakdown(BaseModel):
    status: str
    count: int


class RecentUser(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RecentCourse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class OverviewStats(BaseModel):
    total_users: int
    total_students: int
    total_instructors: int
    total_courses: int
    published_courses: int
    pending_review_courses: int
    total_enrollments: int
    total_revenue_cents: int
    currency: str
    open_support_tickets: int
    user_growth: list[TrendPoint]
    enrollment_trend: list[TrendPoint]
    revenue_trend: list[RevenueTrendPoint]
    role_breakdown: list[RoleBreakdown]
    course_status_breakdown: list[CourseStatusBreakdown]
    recent_users: list[RecentUser]
    recent_courses: list[RecentCourse]


async def _scalar_int(db: AsyncSession, statement) -> int:
    return int((await db.execute(statement)).scalar_one() or 0)


async def _load_overview_counts(db: AsyncSession) -> dict[str, int]:
    revenue_expr = func.coalesce(func.sum(Enrollment.amount_paid_cents), 0)
    return {
        "total_users": await _scalar_int(db, select(func.count(User.id))),
        "total_students": await _scalar_int(db, select(func.count(User.id)).where(User.role == "student")),
        "total_instructors": await _scalar_int(db, select(func.count(User.id)).where(User.role == "instructor")),
        "total_courses": await _scalar_int(db, select(func.count(Course.id))),
        "published_courses": await _scalar_int(
            db, select(func.count(Course.id)).where(Course.status == "published")
        ),
        "pending_review_courses": await _scalar_int(
            db, select(func.count(Course.id)).where(Course.status == "in_review")
        ),
        "total_enrollments": await _scalar_int(db, select(func.count(Enrollment.id))),
        "total_revenue_cents": await _scalar_int(
            db, select(revenue_expr).where(Enrollment.status != "refunded")
        ),
        "open_support_tickets": await _scalar_int(
            db, select(func.count(SupportTicket.id)).where(SupportTicket.status.in_(OPEN_SUPPORT_STATUSES))
        ),
    }


def _last_12_month_starts() -> list[datetime]:
    current = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months = []
    current_index = (current.year * 12) + current.month - 1
    for offset in range(11, -1, -1):
        month_index = current_index - offset
        year = month_index // 12
        month = (month_index % 12) + 1
        months.append(datetime(year, month, 1, tzinfo=timezone.utc))
    return months


async def _load_monthly_counts(db: AsyncSession, id_column, created_at_column) -> list[TrendPoint]:
    month_starts = _last_12_month_starts()
    since = month_starts[0]
    month_bucket = func.date_trunc("month", created_at_column)
    result = await db.execute(
        select(month_bucket, func.count(id_column))
        .where(created_at_column >= since)
        .group_by(month_bucket)
        .order_by(month_bucket)
    )
    counts_by_month = {row[0].strftime("%Y-%m"): int(row[1] or 0) for row in result.all()}
    return [
        TrendPoint(month=month_start.strftime("%Y-%m"), value=counts_by_month.get(month_start.strftime("%Y-%m"), 0))
        for month_start in month_starts
    ]


async def _load_revenue_trend(db: AsyncSession) -> list[RevenueTrendPoint]:
    month_starts = _last_12_month_starts()
    since = month_starts[0]
    month_bucket = func.date_trunc("month", Enrollment.created_at)
    revenue_expr = func.coalesce(func.sum(Enrollment.amount_paid_cents), 0)
    result = await db.execute(
        select(month_bucket, revenue_expr)
        .where(Enrollment.status != "refunded", Enrollment.created_at >= since)
        .group_by(month_bucket)
        .order_by(month_bucket)
    )
    revenue_by_month = {row[0].strftime("%Y-%m"): int(row[1] or 0) for row in result.all()}
    return [
        RevenueTrendPoint(
            month=month_start.strftime("%Y-%m"),
            revenue_cents=revenue_by_month.get(month_start.strftime("%Y-%m"), 0),
        )
        for month_start in month_starts
    ]


async def _load_role_breakdown(db: AsyncSession) -> list[RoleBreakdown]:
    result = await db.execute(
        select(User.role, func.count(User.id)).group_by(User.role).order_by(User.role)
    )
    return [RoleBreakdown(role=row[0], count=int(row[1] or 0)) for row in result.all()]


async def _load_course_status_breakdown(db: AsyncSession) -> list[CourseStatusBreakdown]:
    result = await db.execute(
        select(Course.status, func.count(Course.id)).group_by(Course.status).order_by(Course.status)
    )
    return [CourseStatusBreakdown(status=row[0], count=int(row[1] or 0)) for row in result.all()]


async def _load_recent_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(5))
    return list(result.scalars().all())


async def _load_recent_courses(db: AsyncSession) -> list[Course]:
    result = await db.execute(
        select(Course).where(Course.status == "in_review").order_by(Course.created_at.desc()).limit(5)
    )
    recent_courses = list(result.scalars().all())
    if recent_courses:
        return recent_courses
    fallback = await db.execute(select(Course).order_by(Course.created_at.desc()).limit(5))
    return list(fallback.scalars().all())


@router.get("/stats", response_model=OverviewStats)
async def get_stats(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> OverviewStats:
    counts = await _load_overview_counts(db)
    return OverviewStats(
        **counts,
        currency=DEFAULT_CURRENCY,
        user_growth=await _load_monthly_counts(db, User.id, User.created_at),
        enrollment_trend=await _load_monthly_counts(db, Enrollment.id, Enrollment.created_at),
        revenue_trend=await _load_revenue_trend(db),
        role_breakdown=await _load_role_breakdown(db),
        course_status_breakdown=await _load_course_status_breakdown(db),
        recent_users=await _load_recent_users(db),
        recent_courses=await _load_recent_courses(db),
    )


# ── Course moderation ──────────────────────────────────────────────────────────

class AdminCourseRead(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    status: str
    instructor_id: uuid.UUID
    enrollment_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CourseStatusUpdate(BaseModel):
    status: str  # published | archived | in_review | draft


@router.get("/courses", response_model=list[AdminCourseRead])
async def list_all_courses(
    status_filter: str | None = None,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    q = select(Course).order_by(Course.created_at.desc())
    if status_filter:
        q = q.where(Course.status == status_filter)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.patch("/courses/{course_id}/status", response_model=AdminCourseRead)
async def update_course_status(
    course_id: str,
    body: CourseStatusUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> Course:
    valid_statuses = ("draft", "in_review", "published", "archived")
    if body.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Use: {valid_statuses}")
    result = await db.execute(select(Course).where(Course.id == uuid.UUID(course_id)))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.status = body.status
    await db.commit()
    await db.refresh(course)

    if body.status in ("published", "archived"):
        title = "Your course was approved" if body.status == "published" else "Your course was rejected"
        body_text = f'"{course.title}" has been {"published" if body.status == "published" else "rejected by the review team"}'
        db.add(Notification(
            user_id=course.instructor_id,
            type="course_review",
            title=title,
            body=body_text,
            link=f"/instructor/courses/{course.id}/manage/basics",
        ))
        await db.commit()

    return course


# ── User management ───────────────────────────────────────────────────────────

class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleSwitch(BaseModel):
    role: str  # student | instructor


@router.get("/users", response_model=list[AdminUserRead])
async def list_users(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


@router.patch("/users/{user_id}/status", response_model=AdminUserRead)
async def update_user_status(
    user_id: str,
    body: UserStatusUpdate,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify own account")

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"https://api.clerk.com/v1/users/{user.clerk_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}", "Content-Type": "application/json"},
            json={"public_metadata": {"suspended": not body.is_active}},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to update Clerk status")

    user.is_active = body.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=AdminUserRead)
async def switch_user_role(
    user_id: str,
    body: UserRoleSwitch,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    if body.role not in ("student", "instructor"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be student or instructor")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify own account")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change admin role")
    if user.role == body.role:
        return user

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"https://api.clerk.com/v1/users/{user.clerk_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}", "Content-Type": "application/json"},
            json={"public_metadata": {"role": body.role}},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to update Clerk role")

    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return user


# ── Affiliate management ───────────────────────────────────────────────────────

class AdminAffiliateLinkRead(BaseModel):
    instructor_id: uuid.UUID
    instructor_email: str
    instructor_name: str
    code: str
    commission_pct: int
    click_count: int
    is_active: bool
    total_conversions: int


class AdminCommissionUpdate(BaseModel):
    commission_pct: int = Field(..., ge=1, le=100)


@router.get("/affiliates", response_model=list[AdminAffiliateLinkRead])
async def list_affiliate_links(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminAffiliateLinkRead]:
    result = await db.execute(
        select(AffiliateLink, User)
        .join(User, User.id == AffiliateLink.instructor_id)
        .order_by(AffiliateLink.click_count.desc())
    )
    rows = result.all()
    out = []
    for link, instructor in rows:
        count_result = await db.execute(
            select(func.count(AffiliateConversion.id)).where(
                AffiliateConversion.link_id == link.id
            )
        )
        total_conversions = count_result.scalar_one()
        out.append(AdminAffiliateLinkRead(
            instructor_id=instructor.id,
            instructor_email=instructor.email,
            instructor_name=f"{instructor.first_name} {instructor.last_name}".strip() or instructor.email,
            code=link.code,
            commission_pct=link.commission_pct,
            click_count=link.click_count,
            is_active=link.is_active,
            total_conversions=total_conversions,
        ))
    return out


@router.patch("/affiliates/{instructor_id}/commission", response_model=AdminAffiliateLinkRead)
async def update_affiliate_commission(
    instructor_id: uuid.UUID,
    body: AdminCommissionUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminAffiliateLinkRead:
    result = await db.execute(
        select(AffiliateLink, User)
        .join(User, User.id == AffiliateLink.instructor_id)
        .where(AffiliateLink.instructor_id == instructor_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No affiliate link for this instructor")
    link, instructor = row
    link.commission_pct = body.commission_pct
    await db.commit()
    await db.refresh(link)
    count_result = await db.execute(
        select(func.count(AffiliateConversion.id)).where(AffiliateConversion.link_id == link.id)
    )
    return AdminAffiliateLinkRead(
        instructor_id=instructor.id,
        instructor_email=instructor.email,
        instructor_name=f"{instructor.first_name} {instructor.last_name}".strip() or instructor.email,
        code=link.code,
        commission_pct=link.commission_pct,
        click_count=link.click_count,
        is_active=link.is_active,
        total_conversions=count_result.scalar_one(),
    )
