import secrets
import uuid

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_instructor
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.affiliate import AffiliateConversion, AffiliateLink
from app.db.tables.user import User
from app.schemas.affiliate import (
    AffiliateLinkRead,
    AffiliateLinkUpdate,
    AffiliateConversionRead,
    AffiliateStatsRead,
)

log = structlog.get_logger()
router = APIRouter(prefix="/affiliate", tags=["affiliate"])

_MAX_OFFSET = 10_000
_MAX_LIMIT = 100


async def _get_or_create_link(instructor: User, db: AsyncSession) -> AffiliateLink:
    """Get existing affiliate link or create one atomically (no race condition)."""
    result = await db.execute(
        select(AffiliateLink).where(AffiliateLink.instructor_id == instructor.id)
    )
    link = result.scalar_one_or_none()
    if link:
        return link

    code = secrets.token_urlsafe(6).upper().replace("-", "").replace("_", "")[:8]
    stmt = (
        pg_insert(AffiliateLink)
        .values(instructor_id=instructor.id, code=code)
        .on_conflict_do_nothing()
    )
    try:
        await db.execute(stmt)
        await db.commit()
    except Exception:
        await db.rollback()

    result = await db.execute(
        select(AffiliateLink).where(AffiliateLink.instructor_id == instructor.id)
    )
    link = result.scalar_one()
    log.info("affiliate_link_resolved", instructor_id=str(instructor.id), code=link.code)
    return link


async def _build_stats(link: AffiliateLink, db: AsyncSession) -> AffiliateStatsRead:
    totals_result = await db.execute(
        select(
            func.count(AffiliateConversion.id),
            func.coalesce(func.sum(AffiliateConversion.amount_cents), 0),
            func.coalesce(func.sum(AffiliateConversion.commission_cents), 0),
        ).where(AffiliateConversion.link_id == link.id)
    )
    row = totals_result.one()
    total_conversions, total_revenue, total_commission = row[0], row[1], row[2]

    pending_result = await db.execute(
        select(func.coalesce(func.sum(AffiliateConversion.commission_cents), 0)).where(
            AffiliateConversion.link_id == link.id,
            AffiliateConversion.status == "pending",
        )
    )
    pending_commission = pending_result.scalar() or 0

    return AffiliateStatsRead(
        link=AffiliateLinkRead.model_validate(link),
        total_conversions=total_conversions,
        total_revenue_cents=total_revenue,
        total_commission_cents=total_commission,
        pending_commission_cents=pending_commission,
    )


@router.get("/my-link", response_model=AffiliateStatsRead)
async def get_my_link(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> AffiliateStatsRead:
    link = await _get_or_create_link(instructor, db)
    return await _build_stats(link, db)


@router.patch("/my-link", response_model=AffiliateStatsRead)
async def update_my_link(
    body: AffiliateLinkUpdate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> AffiliateStatsRead:
    result = await db.execute(
        select(AffiliateLink).where(AffiliateLink.instructor_id == instructor.id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No affiliate link yet — visit GET /affiliate/my-link first")
    if body.is_active is not None:
        link.is_active = body.is_active
    if body.commission_pct is not None:
        link.commission_pct = body.commission_pct
    await db.commit()
    await db.refresh(link)
    return await _build_stats(link, db)


@router.get("/my-conversions", response_model=list[AffiliateConversionRead])
async def list_my_conversions(
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> list[AffiliateConversionRead]:
    link_result = await db.execute(
        select(AffiliateLink).where(AffiliateLink.instructor_id == instructor.id)
    )
    link = link_result.scalar_one_or_none()
    if not link:
        return []
    result = await db.execute(
        select(AffiliateConversion)
        .where(AffiliateConversion.link_id == link.id)
        .order_by(AffiliateConversion.created_at.desc())
        .limit(min(limit, _MAX_LIMIT))
        .offset(min(offset, _MAX_OFFSET))
    )
    return [AffiliateConversionRead.model_validate(c) for c in result.scalars().all()]


@router.post("/track/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def track_click(
    request: Request,
    code: str = Path(..., min_length=1, max_length=20, pattern=r"^[A-Za-z0-9]+$"),
    db: AsyncSession = Depends(get_db),
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"rate:track:{client_ip}"
    try:
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        count = await r.incr(rate_key)
        if count == 1:
            await r.expire(rate_key, 60)
        await r.aclose()
        if count > 10:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
    except HTTPException:
        raise
    except Exception:
        pass  # Redis unavailable — allow through, don't break tracking

    result = await db.execute(
        select(AffiliateLink.id).where(
            AffiliateLink.code == code.upper(),
            AffiliateLink.is_active == True,  # noqa: E712
        )
    )
    link_id = result.scalar_one_or_none()
    if link_id:
        await db.execute(
            update(AffiliateLink)
            .where(AffiliateLink.id == link_id)
            .values(click_count=AffiliateLink.click_count + 1)
        )
        await db.commit()
