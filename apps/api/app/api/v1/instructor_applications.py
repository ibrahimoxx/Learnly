import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.instructor_application import InstructorApplication
from app.db.tables.user import User
from app.schemas.instructor_application import (
    InstructorApplicationCreate,
    InstructorApplicationRead,
    InstructorApplicationReject,
)

router = APIRouter(tags=["instructor-applications"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return user


# ── Student: submit application ───────────────────────────────────────────────

@router.post(
    "/instructor-applications",
    response_model=InstructorApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_application(
    body: InstructorApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InstructorApplicationRead:
    if current_user.role in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already an instructor",
        )

    existing = (
        await db.execute(
            select(InstructorApplication).where(
                InstructorApplication.user_id == current_user.id,
                InstructorApplication.status.in_(("pending", "approved")),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application already submitted" if existing.status == "pending" else "Already an instructor",
        )

    app_obj = InstructorApplication(
        user_id=current_user.id,
        **body.model_dump(),
    )
    db.add(app_obj)
    await db.commit()
    await db.refresh(app_obj)
    return InstructorApplicationRead.model_validate(app_obj)


# ── Student: get my application ───────────────────────────────────────────────

@router.get("/instructor-applications/my", response_model=InstructorApplicationRead | None)
async def get_my_application(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InstructorApplicationRead | None:
    result = (
        await db.execute(
            select(InstructorApplication)
            .where(InstructorApplication.user_id == current_user.id)
            .order_by(InstructorApplication.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if not result:
        return None
    return InstructorApplicationRead.model_validate(result)


# ── Admin: list applications ──────────────────────────────────────────────────

@router.get("/admin/instructor-applications", response_model=list[InstructorApplicationRead])
async def list_applications(
    status_filter: str | None = Query(None, alias="status"),
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[InstructorApplicationRead]:
    q = select(InstructorApplication).order_by(InstructorApplication.created_at.desc())
    if status_filter:
        q = q.where(InstructorApplication.status == status_filter)
    rows = (await db.execute(q)).scalars().all()
    return [InstructorApplicationRead.model_validate(r) for r in rows]


# ── Admin: approve ────────────────────────────────────────────────────────────

@router.put("/admin/instructor-applications/{app_id}/approve", response_model=InstructorApplicationRead)
async def approve_application(
    app_id: uuid.UUID,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> InstructorApplicationRead:
    app_obj = (
        await db.execute(select(InstructorApplication).where(InstructorApplication.id == app_id))
    ).scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_obj.status != "pending":
        raise HTTPException(status_code=409, detail=f"Application already {app_obj.status}")

    # Get the applicant
    applicant = (
        await db.execute(select(User).where(User.id == app_obj.user_id))
    ).scalar_one_or_none()
    if not applicant:
        raise HTTPException(status_code=404, detail="User not found")

    # Update Clerk metadata
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"https://api.clerk.com/v1/users/{applicant.clerk_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}", "Content-Type": "application/json"},
            json={"public_metadata": {"role": "instructor"}},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Failed to update Clerk role")

    applicant.role = "instructor"
    app_obj.status = "approved"
    app_obj.reviewed_by = admin.id
    app_obj.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(app_obj)
    return InstructorApplicationRead.model_validate(app_obj)


# ── Admin: reject ─────────────────────────────────────────────────────────────

@router.put("/admin/instructor-applications/{app_id}/reject", response_model=InstructorApplicationRead)
async def reject_application(
    app_id: uuid.UUID,
    body: InstructorApplicationReject,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> InstructorApplicationRead:
    app_obj = (
        await db.execute(select(InstructorApplication).where(InstructorApplication.id == app_id))
    ).scalar_one_or_none()
    if not app_obj:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_obj.status != "pending":
        raise HTTPException(status_code=409, detail=f"Application already {app_obj.status}")

    app_obj.status = "rejected"
    app_obj.rejection_reason = body.reason
    app_obj.reviewed_by = admin.id
    app_obj.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(app_obj)
    return InstructorApplicationRead.model_validate(app_obj)


# ── Admin: downgrade instructor to student ────────────────────────────────────

@router.put("/admin/users/{user_id}/downgrade", status_code=200)
async def downgrade_to_student(
    user_id: uuid.UUID,
    admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot downgrade admin")

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"https://api.clerk.com/v1/users/{user.clerk_id}/metadata",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}", "Content-Type": "application/json"},
            json={"public_metadata": {"role": "student"}},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Failed to update Clerk role")

    user.role = "student"
    await db.commit()
    return {"role": "student"}
