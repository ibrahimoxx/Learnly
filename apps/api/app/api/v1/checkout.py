import asyncio
import uuid
from datetime import datetime, timezone
from urllib.parse import urlencode

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
from app.schemas.checkout import (
    CheckoutSessionCreate,
    CheckoutSessionRead,
    GiftCheckoutSessionCreate,
)
from app.api.v1.webhooks import _fulfill_checkout

log = structlog.get_logger()
router = APIRouter(prefix="/checkout", tags=["checkout"])
STRIPE_ERROR_TYPES = tuple(
    error_type
    for error_type in {
        getattr(stripe, "StripeError", None),
        getattr(getattr(stripe, "error", None), "StripeError", None),
    }
    if error_type is not None
)

MAX_CHECKOUT_ITEMS = 12


def _apply_coupon_discount(price_cents: int, coupon: Coupon) -> int:
    if coupon.discount_type == "percent":
        return max(0, price_cents - int(price_cents * coupon.discount_value / 100))
    return max(0, price_cents - coupon.discount_value)


def _normalize_course_ids(course_id: str | None, course_ids: list[str] | None) -> list[uuid.UUID]:
    raw = course_ids if course_ids else ([course_id] if course_id else [])
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No course specified")

    seen: set[uuid.UUID] = set()
    ordered: list[uuid.UUID] = []
    for value in raw:
        try:
            parsed = uuid.UUID(value)
        except (ValueError, AttributeError, TypeError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course id") from None
        if parsed not in seen:
            seen.add(parsed)
            ordered.append(parsed)

    if len(ordered) > MAX_CHECKOUT_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot checkout more than {MAX_CHECKOUT_ITEMS} courses at once",
        )
    return ordered


async def _create_stripe_session(**params: object) -> stripe.checkout.Session:
    create_async = getattr(stripe.checkout.Session, "create_async", None)
    if create_async:
        return await create_async(**params)
    return await asyncio.to_thread(stripe.checkout.Session.create, **params)


def _get_stripe_error_message(exc: BaseException) -> str:
    message = getattr(exc, "user_message", None) or getattr(exc, "message", None) or str(exc)
    return " ".join(str(message).split())


@router.post("/sessions", response_model=CheckoutSessionRead)
async def create_checkout_session(
    body: CheckoutSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionRead:
    course_ids = _normalize_course_ids(body.course_id, body.course_ids)
    is_multi = len(course_ids) > 1

    if is_multi and (body.coupon_code or body.affiliate_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupons and affiliate codes apply to single-course checkout only",
        )

    courses_result = await db.execute(select(Course).where(Course.id.in_(course_ids)))
    courses_by_id = {course.id: course for course in courses_result.scalars().all()}
    if len(courses_by_id) != len(course_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    for course_id in course_ids:
        course = courses_by_id[course_id]
        if course.status != "published":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not published")
        if course.is_free:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course is free — use enroll endpoint")

    existing = await db.execute(
        select(Enrollment.course_id).where(
            Enrollment.student_id == user.id,
            Enrollment.course_id.in_(course_ids),
        )
    )
    if existing.first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")

    final_price = courses_by_id[course_ids[0]].price_in_cents
    applied_coupon: Coupon | None = None

    if not is_multi and body.coupon_code:
        course = courses_by_id[course_ids[0]]
        coupon_res = await db.execute(
            select(Coupon).where(Coupon.code == body.coupon_code.upper(), Coupon.is_active == True)  # noqa: E712
        )
        coupon = coupon_res.scalar_one_or_none()
        if coupon and (not coupon.course_id or coupon.course_id == course.id):
            if not coupon.expires_at or coupon.expires_at >= datetime.now(timezone.utc):
                if coupon.max_uses is None or coupon.uses_count < coupon.max_uses:
                    final_price = _apply_coupon_discount(final_price, coupon)
                    applied_coupon = coupon

    line_items = []
    for course_id in course_ids:
        course = courses_by_id[course_id]
        unit_amount = course.price_in_cents if is_multi else final_price
        line_items.append({
            "price_data": {
                "currency": "usd",
                "unit_amount": unit_amount,
                "product_data": {"name": course.title},
            },
            "quantity": 1,
        })

    metadata: dict[str, str] = {
        "user_id": str(user.id),
        "course_ids": ",".join(str(cid) for cid in course_ids),
    }
    if not is_multi:
        metadata["affiliate_code"] = body.affiliate_code.upper() if body.affiliate_code else ""
        if applied_coupon:
            metadata["coupon_id"] = str(applied_coupon.id)

    idempotency_key = f"checkout-{user.id}-{uuid.uuid4().hex}"
    if is_multi:
        cancel_url = f"{settings.app_url}/checkout/cancel"
    else:
        cancel_url = f"{settings.app_url}/checkout/cancel?{urlencode({'course': courses_by_id[course_ids[0]].slug})}"
    try:
        session = await _create_stripe_session(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=f"{settings.app_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            metadata=metadata,
            idempotency_key=idempotency_key,
        )
    except STRIPE_ERROR_TYPES as exc:
        message = _get_stripe_error_message(exc)
        log.error(
            "checkout_session_failed",
            error=message,
            user_id=str(user.id),
            course_ids=[str(cid) for cid in course_ids],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {message}",
        ) from exc

    if applied_coupon:
        applied_coupon.uses_count += 1
        await db.commit()

    log.info(
        "checkout_session_created",
        session_id=session.id,
        user_id=str(user.id),
        course_ids=[str(cid) for cid in course_ids],
        coupon=applied_coupon.code if applied_coupon else None,
        final_price=final_price if not is_multi else None,
    )
    return CheckoutSessionRead(checkout_url=session.url, session_id=session.id)


@router.post("/gift-sessions", response_model=CheckoutSessionRead)
async def create_gift_checkout_session(
    body: GiftCheckoutSessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutSessionRead:
    course_ids = _normalize_course_ids(body.course_id, body.course_ids)
    is_multi = len(course_ids) > 1

    courses_result = await db.execute(select(Course).where(Course.id.in_(course_ids)))
    courses_by_id = {course.id: course for course in courses_result.scalars().all()}
    if len(courses_by_id) != len(course_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    for course_id in course_ids:
        course = courses_by_id[course_id]
        if course.status != "published":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course not published")
        if course.is_free:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course is free — use enroll endpoint")

    recipient_result = await db.execute(
        select(User).where(User.email == body.recipient_email.lower())
    )
    recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient must have a Learnly account before they can receive a gift",
        )
    if recipient.id == user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot gift a course to yourself")

    existing = await db.execute(
        select(Enrollment.course_id).where(
            Enrollment.student_id == recipient.id,
            Enrollment.course_id.in_(course_ids),
        )
    )
    if existing.first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Recipient is already enrolled")

    line_items = [
        {
            "price_data": {
                "currency": "usd",
                "unit_amount": courses_by_id[course_id].price_in_cents,
                "product_data": {"name": f"Gift: {courses_by_id[course_id].title}"},
            },
            "quantity": 1,
        }
        for course_id in course_ids
    ]

    metadata: dict[str, str] = {
        "user_id": str(user.id),
        "course_ids": ",".join(str(cid) for cid in course_ids),
        "is_gift": "true",
        "recipient_user_id": str(recipient.id),
        "recipient_email": recipient.email,
        "gift_message": (body.gift_message or "")[:500],
    }

    idempotency_key = f"gift-checkout-{user.id}-{uuid.uuid4().hex}"
    if is_multi:
        cancel_url = f"{settings.app_url}/checkout/cancel"
    else:
        cancel_url = f"{settings.app_url}/checkout/cancel?{urlencode({'course': courses_by_id[course_ids[0]].slug})}"
    try:
        session = await _create_stripe_session(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=f"{settings.app_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            metadata=metadata,
            idempotency_key=idempotency_key,
        )
    except STRIPE_ERROR_TYPES as exc:
        message = _get_stripe_error_message(exc)
        log.error(
            "gift_checkout_session_failed",
            error=message,
            user_id=str(user.id),
            course_ids=[str(cid) for cid in course_ids],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payment provider error: {message}",
        ) from exc

    log.info(
        "gift_checkout_session_created",
        session_id=session.id,
        user_id=str(user.id),
        recipient_id=str(recipient.id),
        course_ids=[str(cid) for cid in course_ids],
    )
    return CheckoutSessionRead(checkout_url=session.url, session_id=session.id)


@router.get("/sessions/{session_id}/confirm")
async def confirm_checkout_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Fallback fulfillment for the success page — in case the Stripe webhook
    hasn't reached this server (e.g. `stripe listen` not running locally).
    Idempotent: safe to call even if the webhook already fulfilled the order."""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except STRIPE_ERROR_TYPES as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkout session not found") from exc

    metadata = session.get("metadata") or {}
    session_user_id = metadata.get("user_id")
    if session_user_id != str(user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your checkout session")

    if session.get("payment_status") != "paid":
        return {"fulfilled": False, "reason": "payment not completed"}

    await _fulfill_checkout(db, session)
    return {"fulfilled": True}
