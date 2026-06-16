from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.tables.course import Course

router = APIRouter(prefix="/stats", tags=["public"])


class PlatformStats(BaseModel):
    total_courses: int
    total_students: int
    avg_rating: float
    total_reviews: int


@router.get("", response_model=PlatformStats)
async def get_platform_stats(db: AsyncSession = Depends(get_db)) -> PlatformStats:
    result = await db.execute(
        select(
            func.count(Course.id),
            func.coalesce(func.sum(Course.enrollment_count), 0),
            func.coalesce(func.round(func.avg(Course.rating), 1), 0),
            func.coalesce(func.sum(Course.review_count), 0),
        ).where(Course.status == "published")
    )
    row = result.one()
    return PlatformStats(
        total_courses=row[0],
        total_students=row[1],
        avg_rating=float(row[2]),
        total_reviews=row[3],
    )
