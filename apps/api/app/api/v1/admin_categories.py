import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin as _require_admin
from app.db.session import get_db
from app.db.tables.category import Category
from app.db.tables.course import Course
from app.db.tables.user import User
from app.schemas.admin_category import AdminCategoryCreate, AdminCategoryRead, AdminCategoryUpdate

router = APIRouter(prefix="/admin/categories", tags=["admin-categories"])


async def _course_counts(db: AsyncSession) -> dict[uuid.UUID, int]:
    result = await db.execute(select(Course.category_id, func.count(Course.id)).group_by(Course.category_id))
    return {row[0]: row[1] for row in result.all() if row[0] is not None}


@router.get("", response_model=list[AdminCategoryRead])
async def list_categories(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminCategoryRead]:
    result = await db.execute(select(Category).order_by(Category.name))
    categories = list(result.scalars().all())
    counts = await _course_counts(db)

    by_id = {c.id: c for c in categories}
    children: dict[uuid.UUID | None, list[Category]] = {}
    for c in categories:
        children.setdefault(c.parent_id, []).append(c)

    def build(cat: Category) -> AdminCategoryRead:
        return AdminCategoryRead(
            id=cat.id,
            name=cat.name,
            slug=cat.slug,
            parent_id=cat.parent_id,
            course_count=counts.get(cat.id, 0),
            subcategories=[build(child) for child in children.get(cat.id, [])],
        )

    return [build(c) for c in children.get(None, [])]


@router.post("", response_model=AdminCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: AdminCategoryCreate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminCategoryRead:
    existing = await db.execute(
        select(Category).where((Category.name == body.name) | (Category.slug == body.slug))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name or slug already exists")

    if body.parent_id is not None:
        parent = await db.execute(select(Category).where(Category.id == body.parent_id))
        if not parent.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent category not found")

    category = Category(name=body.name, slug=body.slug, parent_id=body.parent_id)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return AdminCategoryRead(
        id=category.id, name=category.name, slug=category.slug, parent_id=category.parent_id,
        course_count=0, subcategories=[],
    )


@router.patch("/{category_id}", response_model=AdminCategoryRead)
async def update_category(
    category_id: uuid.UUID,
    body: AdminCategoryUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminCategoryRead:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if body.parent_id is not None:
        if body.parent_id == category_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category cannot be its own parent")
        parent = await db.execute(select(Category).where(Category.id == body.parent_id))
        if not parent.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent category not found")

        ancestor_id: uuid.UUID | None = body.parent_id
        while ancestor_id is not None:
            if ancestor_id == category_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create a category cycle")
            ancestor = await db.execute(select(Category.parent_id).where(Category.id == ancestor_id))
            ancestor_id = ancestor.scalar_one_or_none()

    if body.name is not None:
        category.name = body.name
    if body.slug is not None:
        category.slug = body.slug
    if body.parent_id is not None or "parent_id" in body.model_fields_set:
        category.parent_id = body.parent_id

    await db.commit()
    await db.refresh(category)

    counts = await _course_counts(db)
    return AdminCategoryRead(
        id=category.id, name=category.name, slug=category.slug, parent_id=category.parent_id,
        course_count=counts.get(category.id, 0), subcategories=[],
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    course_count = (
        await db.execute(select(func.count(Course.id)).where(Course.category_id == category_id))
    ).scalar_one()
    if course_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category still has courses")

    subcat_count = (
        await db.execute(select(func.count(Category.id)).where(Category.parent_id == category_id))
    ).scalar_one()
    if subcat_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category still has subcategories")

    await db.delete(category)
    await db.commit()
