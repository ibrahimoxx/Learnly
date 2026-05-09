import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.coupon import Coupon
from app.db.tables.course import Course
from app.db.tables.user import User
from app.schemas.coupon import CouponCreate, CouponRead, CouponValidate, CouponValidateResult

router = APIRouter(prefix="/coupons", tags=["coupons"])


def _compute_discounted_price(original_cents: int, discount_type: str, discount_value: int) -> int:
    if discount_type == "percent":
        discount = int(original_cents * discount_value / 100)
        return max(0, original_cents - discount)
    else:
        return max(0, original_cents - discount_value)


@router.post("", response_model=CouponRead, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    body: CouponCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Coupon:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")

    if body.course_id:
        course_res = await db.execute(
            select(Course).where(Course.id == uuid.UUID(body.course_id))
        )
        course = course_res.scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        if course.instructor_id != user.id and user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")

    existing = await db.execute(select(Coupon).where(Coupon.code == body.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Coupon code already exists")

    coupon = Coupon(
        course_id=uuid.UUID(body.course_id) if body.course_id else None,
        created_by=user.id,
        code=body.code.upper(),
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
    )
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return coupon


@router.get("", response_model=list[CouponRead])
async def list_coupons(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Coupon]:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")
    result = await db.execute(
        select(Coupon).where(Coupon.created_by == user.id).order_by(Coupon.created_at.desc())
    )
    return list(result.scalars().all())


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_coupon(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Coupon).where(Coupon.code == code.upper()))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coupon not found")
    if coupon.created_by != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your coupon")
    coupon.is_active = False
    await db.commit()


@router.post("/validate", response_model=CouponValidateResult)
async def validate_coupon(
    body: CouponValidate,
    db: AsyncSession = Depends(get_db),
) -> CouponValidateResult:
    course_res = await db.execute(
        select(Course).where(Course.id == uuid.UUID(body.course_id))
    )
    course = course_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    result = await db.execute(select(Coupon).where(Coupon.code == body.code.upper()))
    coupon = result.scalar_one_or_none()

    def invalid(msg: str) -> CouponValidateResult:
        return CouponValidateResult(
            valid=False,
            discount_type="percent",
            discount_value=0,
            original_price_cents=course.price_in_cents,
            discounted_price_cents=course.price_in_cents,
            message=msg,
        )

    if not coupon or not coupon.is_active:
        return invalid("Invalid or expired coupon code")
    if coupon.course_id and coupon.course_id != course.id:
        return invalid("Coupon not valid for this course")
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        return invalid("Coupon has expired")
    if coupon.max_uses is not None and coupon.uses_count >= coupon.max_uses:
        return invalid("Coupon usage limit reached")

    discounted = _compute_discounted_price(course.price_in_cents, coupon.discount_type, coupon.discount_value)
    label = f"{coupon.discount_value}%" if coupon.discount_type == "percent" else f"${coupon.discount_value / 100:.2f}"
    return CouponValidateResult(
        valid=True,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        original_price_cents=course.price_in_cents,
        discounted_price_cents=discounted,
        message=f"{label} off applied",
    )
