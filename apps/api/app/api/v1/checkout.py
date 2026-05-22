import uuid
from datetime import datetime, timezone

import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.coupon import Coupon
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.integrations import stripe_client as _stripe_init  # noqa: F401 — sets api_key
from app.schemas.checkout import CheckoutSessionCreate, CheckoutSessionRead

log = structlog.get_logger()
router = APIRouter(prefix="/checkout", tags=["checkout"])


def _apply_coupon_discount(price_cents: int, coupon: Coupon) -> int:
    if coupon.discount_type == "percent":
        return max(0, price_cents - int(price_cents * coupon.discount_value / 100))
    return max(0, price_cents - coupon.discount_value)


@router.post("/sessions", response_model=CheckoutSessionRead)
async def create_checkout_session(
    body: CheckoutSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionRead:
    course_result = await db.execute(
        select(Course).where(Course.id == uuid.UUID(body.course_id))
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.status != "published":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not published")
    if course.is_free:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course is free — use enroll endpoint")

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id == course.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")

    final_price = course.price_in_cents
    applied_coupon: Coupon | None = None

    if body.coupon_code:
        coupon_res = await db.execute(
            select(Coupon).where(Coupon.code == body.coupon_code.upper(), Coupon.is_active == True)  # noqa: E712
        )
        coupon = coupon_res.scalar_one_or_none()
        if coupon and (not coupon.course_id or coupon.course_id == course.id):
            if not coupon.expires_at or coupon.expires_at >= datetime.now(timezone.utc):
                if coupon.max_uses is None or coupon.uses_count < coupon.max_uses:
                    final_price = _apply_coupon_discount(final_price, coupon)
                    applied_coupon = coupon

    metadata: dict[str, str] = {
        "user_id": str(user.id),
        "course_id": str(course.id),
        "affiliate_code": body.affiliate_code.upper() if body.affiliate_code else "",
    }
    if applied_coupon:
        metadata["coupon_id"] = str(applied_coupon.id)

    idempotency_key = f"checkout-{user.id}-{course.id}"
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": final_price,
                "product_data": {"name": course.title},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.app_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/checkout/cancel?course={course.slug}",
        metadata=metadata,
        idempotency_key=idempotency_key,
    )

    if applied_coupon:
        applied_coupon.uses_count += 1
        await db.commit()

    log.info(
        "checkout_session_created",
        session_id=session.id,
        user_id=str(user.id),
        course_id=str(course.id),
        coupon=applied_coupon.code if applied_coupon else None,
        final_price=final_price,
    )
    return CheckoutSessionRead(checkout_url=session.url, session_id=session.id)
