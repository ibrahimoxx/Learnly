import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.affiliate import AffiliateConversion, AffiliateLink
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return user


# ── Overview ──────────────────────────────────────────────────────────────────

class OverviewStats(BaseModel):
    total_users: int
    total_courses: int
    total_enrollments: int
    published_courses: int
    pending_review_courses: int


@router.get("/stats", response_model=OverviewStats)
async def get_stats(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> OverviewStats:
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    total_courses = (await db.execute(select(func.count(Course.id)))).scalar_one()
    total_enrollments = (await db.execute(select(func.count(Enrollment.id)))).scalar_one()
    published = (await db.execute(
        select(func.count(Course.id)).where(Course.status == "published")
    )).scalar_one()
    in_review = (await db.execute(
        select(func.count(Course.id)).where(Course.status == "in_review")
    )).scalar_one()
    return OverviewStats(
        total_users=total_users,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        published_courses=published,
        pending_review_courses=in_review,
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
    user.is_active = body.is_active
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
