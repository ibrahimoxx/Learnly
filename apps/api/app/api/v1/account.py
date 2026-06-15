from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.gift import Gift
from app.db.tables.user import User
from app.schemas.user import (
    EmailNotificationPrefs,
    PurchaseHistoryItem,
    SubscriptionRead,
    UserPrivacyRead,
    UserPrivacyUpdate,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users/me", tags=["account"])

ALLOWED_USER_UPDATE_FIELDS = {"first_name", "last_name", "bio", "website", "image_url", "timezone"}


@router.get("", response_model=UserRead)
@limiter.limit("30/minute")
async def get_my_account(request: Request, user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("", response_model=UserRead)
@limiter.limit("30/minute")
async def update_my_account(
    request: Request,
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field not in ALLOWED_USER_UPDATE_FIELDS:
            continue
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.get("/privacy", response_model=UserPrivacyRead)
@limiter.limit("30/minute")
async def get_my_privacy(request: Request, user: User = Depends(get_current_user)) -> UserPrivacyRead:
    return UserPrivacyRead(
        is_profile_public=user.is_profile_public,
        email_notification_prefs=EmailNotificationPrefs(**(user.email_notification_prefs or {})),
    )


@router.patch("/privacy", response_model=UserPrivacyRead)
@limiter.limit("30/minute")
async def update_my_privacy(
    request: Request,
    body: UserPrivacyUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPrivacyRead:
    if body.is_profile_public is not None:
        user.is_profile_public = body.is_profile_public
    if body.email_notification_prefs is not None:
        current = EmailNotificationPrefs(**(user.email_notification_prefs or {}))
        merged = current.model_copy(update=body.email_notification_prefs.model_dump(exclude_unset=True))
        user.email_notification_prefs = merged.model_dump()
    await db.commit()
    await db.refresh(user)
    return UserPrivacyRead(
        is_profile_public=user.is_profile_public,
        email_notification_prefs=EmailNotificationPrefs(**(user.email_notification_prefs or {})),
    )


@router.get("/purchase-history", response_model=list[PurchaseHistoryItem])
@limiter.limit("30/minute")
async def get_my_purchase_history(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PurchaseHistoryItem]:
    result = await db.execute(
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == user.id)
        .order_by(Enrollment.created_at.desc())
    )
    rows = result.all()
    if not rows:
        return []

    course_ids = [course.id for _, course in rows]
    gifts_result = await db.execute(
        select(Gift.course_id).where(Gift.recipient_id == user.id, Gift.course_id.in_(course_ids))
    )
    gifted_course_ids = {row[0] for row in gifts_result.all()}

    items: list[PurchaseHistoryItem] = []
    for enrollment, course in rows:
        amount_cents = enrollment.amount_paid_cents
        if amount_cents is None:
            amount_cents = 0 if course.is_free else course.price_in_cents
        items.append(
            PurchaseHistoryItem(
                id=enrollment.id,
                course_id=course.id,
                course_title=course.title,
                course_slug=course.slug,
                amount_cents=amount_cents,
                currency=(enrollment.currency or course.currency or "usd").lower(),
                is_gift_purchase=course.id in gifted_course_ids,
                purchased_at=enrollment.created_at,
            )
        )
    return items


@router.get("/subscription", response_model=SubscriptionRead)
@limiter.limit("30/minute")
async def get_my_subscription(request: Request, user: User = Depends(get_current_user)) -> SubscriptionRead:
    return SubscriptionRead(
        plan="Free",
        status="active",
        description="You're on the free Skillforge plan — pay per course, no recurring charges.",
        renews_at=None,
    )
