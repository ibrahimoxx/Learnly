import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.tables.category import Category
from app.db.tables.course import Course
from app.schemas.category import CategoryRead, CategoryWithCount
from app.schemas.course import CourseListRead, PaginatedCourses

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryWithCount])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryWithCount]:
    result = await db.execute(
        select(Category, func.count(Course.id))
        .join(Course, Course.category_id == Category.id)
        .where(Course.status == "published", Course.organization_id.is_(None))
        .group_by(Category.id)
        .order_by(Category.name)
    )
    return [
        CategoryWithCount(id=category.id, name=category.name, slug=category.slug, course_count=count)
        for category, count in result.all()
    ]


@router.get("/{slug}", response_model=CategoryRead)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)) -> CategoryRead:
    result = await db.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return CategoryRead.model_validate(category)


@router.get("/{slug}/courses", response_model=PaginatedCourses)
async def list_category_courses(
    slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedCourses:
    cat_result = await db.execute(select(Category).where(Category.slug == slug))
    category = cat_result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    base_query = select(Course).where(
        Course.category_id == category.id,
        Course.status == "published",
        Course.organization_id.is_(None),
    )
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()

    query = base_query.order_by(Course.enrollment_count.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    courses = result.scalars().all()

    return PaginatedCourses(
        items=[CourseListRead.model_validate(c) for c in courses],
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit),
    )
