import re
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.enrollment import Enrollment
from app.db.tables.organization import Organization
from app.db.tables.user import User
from app.schemas.course import CourseRead, PaginatedCourses
from app.schemas.organization import OrganizationCreate, OrganizationRead, OrganizationUpdate, OrgStats

log = structlog.get_logger()
router = APIRouter(prefix="/orgs", tags=["organizations"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug[:100]


async def _get_org_or_404(slug: str, db: AsyncSession) -> Organization:
    result = await db.execute(
        select(Organization).where(Organization.slug == slug, Organization.is_active.is_(True))
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.get("/{slug}", response_model=OrganizationRead)
async def get_organization(slug: str, db: AsyncSession = Depends(get_db)) -> OrganizationRead:
    org = await _get_org_or_404(slug, db)
    return OrganizationRead.model_validate(org)


@router.get("/{slug}/stats", response_model=OrgStats)
async def get_org_stats(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> OrgStats:
    org = await _get_org_or_404(slug, db)

    course_count_result = await db.execute(
        select(func.count()).where(Course.organization_id == org.id, Course.status == "published")
    )
    total_courses = course_count_result.scalar_one()

    return OrgStats(total_courses=total_courses, total_members=0)


@router.get("/{slug}/courses", response_model=PaginatedCourses)
async def list_org_courses(
    slug: str,
    page: int = 1,
    limit: int = 20,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> PaginatedCourses:
    org = await _get_org_or_404(slug, db)

    query = select(Course).where(
        Course.organization_id == org.id,
        Course.status == "published",
    )
    if q:
        query = query.where(Course.title.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    offset = (page - 1) * limit
    courses_result = await db.execute(query.order_by(Course.created_at.desc()).offset(offset).limit(limit))
    courses = list(courses_result.scalars().all())

    import math
    return PaginatedCourses(
        items=[CourseRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        pages=math.ceil(total / limit) if total else 1,
    )


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> OrganizationRead:
    slug = _slugify(data.slug or data.name)
    existing = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")

    org = Organization(
        clerk_org_id=data.clerk_org_id,
        name=data.name,
        slug=slug,
        logo_url=data.logo_url,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    log.info("organization_created", slug=slug, clerk_org_id=data.clerk_org_id)
    return OrganizationRead.model_validate(org)


@router.patch("/{slug}", response_model=OrganizationRead)
async def update_organization(
    slug: str,
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> OrganizationRead:
    org = await _get_org_or_404(slug, db)

    if data.name is not None:
        org.name = data.name
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.is_active is not None:
        org.is_active = data.is_active

    await db.commit()
    await db.refresh(org)
    return OrganizationRead.model_validate(org)
