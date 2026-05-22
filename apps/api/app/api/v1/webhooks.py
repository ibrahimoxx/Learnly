import asyncio
import hashlib
import hmac
import time
import uuid

import stripe
import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.db.tables.affiliate import AffiliateConversion, AffiliateLink
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.organization import Organization
from app.db.tables.user import User
from app.email import service as email_service
from app.integrations import stripe_client as _stripe_init  # noqa: F401 — sets api_key

log = structlog.get_logger()
router = APIRouter()


def _verify_clerk_webhook(payload: bytes, svix_id: str, svix_ts: str, svix_sig: str) -> None:
    signed = f"{svix_id}.{svix_ts}.{payload.decode()}"
    secret = settings.clerk_webhook_secret.removeprefix("whsec_")
    import base64
    key = base64.b64decode(secret)
    expected = "v1," + base64.b64encode(
        hmac.new(key, signed.encode(), hashlib.sha256).digest()
    ).decode()
    if not hmac.compare_digest(expected, svix_sig.split(" ")[0]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")
    # Reject stale webhooks (> 5 min)
    if abs(time.time() - int(svix_ts)) > 300:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook timestamp too old")


@router.post("/webhooks/clerk")
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_id: str = Header(..., alias="svix-id"),
    svix_timestamp: str = Header(..., alias="svix-timestamp"),
    svix_signature: str = Header(..., alias="svix-signature"),
) -> dict:
    body = await request.body()

    if settings.clerk_webhook_secret != "whsec_placeholder":
        _verify_clerk_webhook(body, svix_id, svix_timestamp, svix_signature)

    import json
    event = json.loads(body)
    event_type: str = event.get("type", "")
    data: dict = event.get("data", {})

    log.info("clerk_webhook_received", event_type=event_type, event_id=svix_id)

    if event_type == "user.created":
        await _upsert_user(db, data)
        email = (data.get("email_addresses") or [{}])[0].get("email_address", "")
        first_name = data.get("first_name") or "there"
        if email:
            asyncio.get_event_loop().run_in_executor(
                None, email_service.send_welcome, email, first_name
            )
    elif event_type == "user.updated":
        await _upsert_user(db, data)
    elif event_type == "user.deleted":
        await _deactivate_user(db, data.get("id", ""))
    elif event_type == "organization.created":
        await _upsert_organization(db, data)
    elif event_type == "organization.updated":
        await _upsert_organization(db, data)
    elif event_type == "organization.deleted":
        await _deactivate_organization(db, data.get("id", ""))

    return {"received": True}


async def _upsert_user(db: AsyncSession, data: dict) -> None:
    clerk_id: str = data["id"]
    email: str = (data.get("email_addresses") or [{}])[0].get("email_address", "")
    first_name: str = data.get("first_name") or ""
    last_name: str = data.get("last_name") or ""
    image_url: str | None = data.get("image_url")
    role: str = data.get("public_metadata", {}).get("role", "student")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.image_url = image_url
        user.role = role
    else:
        user = User(
            clerk_id=clerk_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            image_url=image_url,
            role=role,
        )
        db.add(user)

    await db.commit()
    log.info("user_upserted", clerk_id=clerk_id, role=role)


async def _upsert_organization(db: AsyncSession, data: dict) -> None:
    import re

    clerk_org_id: str = data["id"]
    name: str = data.get("name") or "Unnamed Org"
    raw_slug: str = data.get("slug") or re.sub(r"[^\w\s-]", "", name.lower()).strip()
    slug = re.sub(r"[\s_-]+", "-", raw_slug)[:100]
    logo_url: str | None = data.get("image_url")

    result = await db.execute(select(Organization).where(Organization.clerk_org_id == clerk_org_id))
    org = result.scalar_one_or_none()

    if org:
        org.name = name
        org.logo_url = logo_url
    else:
        # Ensure slug uniqueness
        base = slug
        i = 1
        while True:
            existing = await db.execute(select(Organization).where(Organization.slug == slug))
            if not existing.scalar_one_or_none():
                break
            slug = f"{base}-{i}"
            i += 1

        org = Organization(clerk_org_id=clerk_org_id, name=name, slug=slug, logo_url=logo_url)
        db.add(org)

    await db.commit()
    log.info("organization_upserted", clerk_org_id=clerk_org_id, slug=slug)


async def _deactivate_organization(db: AsyncSession, clerk_org_id: str) -> None:
    result = await db.execute(select(Organization).where(Organization.clerk_org_id == clerk_org_id))
    org = result.scalar_one_or_none()
    if org:
        org.is_active = False
        await db.commit()
        log.info("organization_deactivated", clerk_org_id=clerk_org_id)


async def _deactivate_user(db: AsyncSession, clerk_id: str) -> None:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_active = False
        await db.commit()
        log.info("user_deactivated", clerk_id=clerk_id)


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str = Header(..., alias="stripe-signature"),
) -> dict:
    body = await request.body()

    try:
        if settings.stripe_webhook_secret and settings.stripe_webhook_secret != "whsec_":
            event = stripe.Webhook.construct_event(body, stripe_signature, settings.stripe_webhook_secret)
        else:
            import json
            event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature")

    event_type = event["type"] if isinstance(event, dict) else event.type
    event_id = event.get("id", "") if isinstance(event, dict) else event.id
    log.info("stripe_webhook_received", event_type=event_type, event_id=event_id)

    if event_type == "checkout.session.completed":
        data = event["data"]["object"] if isinstance(event, dict) else event.data.object
        await _fulfill_checkout(db, data)

    return {"received": True}


async def _fulfill_checkout(db: AsyncSession, session: object) -> None:
    def _get(obj: object, key: str, default: object = None) -> object:
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    meta = _get(session, "metadata") or {}
    user_id = meta.get("user_id") if isinstance(meta, dict) else getattr(meta, "user_id", None)
    course_id = meta.get("course_id") if isinstance(meta, dict) else getattr(meta, "course_id", None)
    session_id = _get(session, "id")
    if not user_id or not course_id:
        log.warning("stripe_webhook_missing_metadata", session_id=session_id)
        return

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == uuid.UUID(user_id),
            Enrollment.course_id == uuid.UUID(course_id),
        )
    )
    if existing.scalar_one_or_none():
        return

    enrollment = Enrollment(
        student_id=uuid.UUID(user_id),
        course_id=uuid.UUID(course_id),
    )
    db.add(enrollment)

    course_result = await db.execute(select(Course).where(Course.id == uuid.UUID(course_id)))
    course = course_result.scalar_one_or_none()
    if course:
        course.enrollment_count = (course.enrollment_count or 0) + 1

    await db.commit()
    log.info("enrollment_created_via_stripe", user_id=user_id, course_id=course_id)

    raw_aff_code = meta.get("affiliate_code", "") if isinstance(meta, dict) else getattr(meta, "affiliate_code", "")
    import re as _re
    affiliate_code = raw_aff_code.upper() if raw_aff_code and _re.match(r'^[A-Z0-9]{1,20}$', raw_aff_code.upper()) else ""
    if affiliate_code:
        link_result = await db.execute(
            select(AffiliateLink).where(
                AffiliateLink.code == affiliate_code,
                AffiliateLink.is_active == True,  # noqa: E712
            )
        )
        aff_link = link_result.scalar_one_or_none()
        if aff_link and aff_link.instructor_id != uuid.UUID(user_id):
            from decimal import Decimal, ROUND_HALF_UP
            amount = int(_get(session, "amount_total") or 0)
            commission = int(
                (Decimal(amount) * Decimal(aff_link.commission_pct) / Decimal(100))
                .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
            )
            db.add(AffiliateConversion(
                link_id=aff_link.id,
                enrollment_id=enrollment.id,
                course_id=uuid.UUID(course_id),
                student_id=uuid.UUID(user_id),
                amount_cents=amount,
                commission_cents=commission,
            ))
            await db.commit()
