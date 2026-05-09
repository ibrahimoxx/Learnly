import uuid

import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.user import User
from app.integrations import stripe_client as _stripe_init  # noqa: F401 — sets api_key
from app.schemas.checkout import CheckoutSessionCreate, CheckoutSessionRead

log = structlog.get_logger()
router = APIRouter(prefix="/checkout", tags=["checkout"])


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

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": course.price_in_cents,
                "product_data": {"name": course.title},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.app_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.app_url}/checkout/cancel?course={course.slug}",
        metadata={
            "user_id": str(user.id),
            "course_id": str(course.id),
        },
    )

    log.info("checkout_session_created", session_id=session.id, user_id=str(user.id), course_id=str(course.id))
    return CheckoutSessionRead(checkout_url=session.url, session_id=session.id)
