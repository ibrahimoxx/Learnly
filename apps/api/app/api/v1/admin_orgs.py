import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.course import Course
from app.db.tables.organization import Organization
from app.db.tables.user import User
from app.schemas.admin_org import AdminOrgRead, AdminOrgStatusUpdate

router = APIRouter(prefix="/admin/orgs", tags=["admin-orgs"])

@router.get("", response_model=list[AdminOrgRead])
async def list_orgs(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminOrgRead]:
    result = await db.execute(
        select(Organization, func.count(Course.id))
        .outerjoin(Course, Course.organization_id == Organization.id)
        .group_by(Organization.id)
        .order_by(Organization.created_at.desc())
    )
    return [
        AdminOrgRead(
            id=org.id,
            name=org.name,
            slug=org.slug,
            clerk_org_id=org.clerk_org_id,
            is_active=org.is_active,
            course_count=count,
            created_at=org.created_at,
        )
        for org, count in result.all()
    ]


@router.patch("/{org_id}/status", response_model=AdminOrgRead)
async def update_org_status(
    org_id: uuid.UUID,
    body: AdminOrgStatusUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminOrgRead:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    org.is_active = body.is_active
    await db.commit()
    await db.refresh(org)

    course_count = (
        await db.execute(select(func.count(Course.id)).where(Course.organization_id == org_id))
    ).scalar_one()
    return AdminOrgRead(
        id=org.id, name=org.name, slug=org.slug, clerk_org_id=org.clerk_org_id,
        is_active=org.is_active, course_count=course_count, created_at=org.created_at,
    )
