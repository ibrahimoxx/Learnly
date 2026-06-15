import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.feature_flag import FeatureFlag
from app.db.tables.user import User
from app.schemas.feature_flag import FeatureFlagCreate, FeatureFlagRead, FeatureFlagUpdate

router = APIRouter(prefix="/admin/feature-flags", tags=["admin-feature-flags"])

@router.get("", response_model=list[FeatureFlagRead])
async def list_flags(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[FeatureFlag]:
    result = await db.execute(select(FeatureFlag).order_by(FeatureFlag.key))
    return list(result.scalars().all())


@router.post("", response_model=FeatureFlagRead, status_code=status.HTTP_201_CREATED)
async def create_flag(
    body: FeatureFlagCreate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> FeatureFlag:
    existing = await db.execute(select(FeatureFlag).where(FeatureFlag.key == body.key))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Flag key already exists")

    flag = FeatureFlag(
        key=body.key, label=body.label, description=body.description, is_enabled=body.is_enabled
    )
    db.add(flag)
    await db.commit()
    await db.refresh(flag)
    return flag


@router.patch("/{flag_id}", response_model=FeatureFlagRead)
async def update_flag(
    flag_id: uuid.UUID,
    body: FeatureFlagUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> FeatureFlag:
    result = await db.execute(select(FeatureFlag).where(FeatureFlag.id == flag_id))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found")

    if body.label is not None:
        flag.label = body.label
    if body.description is not None:
        flag.description = body.description
    if body.is_enabled is not None:
        flag.is_enabled = body.is_enabled

    await db.commit()
    await db.refresh(flag)
    return flag
