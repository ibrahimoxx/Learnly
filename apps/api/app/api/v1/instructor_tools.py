import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_instructor
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.db.tables.category import Category
from app.db.tables.course import Course
from app.db.tables.test_video_request import InstructorTestVideoRequest
from app.db.tables.user import User
from app.integrations.storage import get_download_url, get_upload_url
from app.schemas.instructor_tools import (
    MarketplaceInsightRow,
    TestVideoRequestCreate,
    TestVideoRequestRead,
    TestVideoUploadRequest,
    TestVideoUploadResponse,
)

router = APIRouter(prefix="/instructor/tools", tags=["instructor-tools"])

ALLOWED_VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "avi", "mkv", "m4v"}


def _test_video_prefix(instructor_id: uuid.UUID) -> str:
    return f"videos/test-submissions/{instructor_id}/"


@router.post("/test-video/upload-url", response_model=TestVideoUploadResponse)
@limiter.limit("10/minute")
async def get_test_video_upload_url(
    request: Request,
    body: TestVideoUploadRequest,
    instructor: User = Depends(require_instructor),
) -> TestVideoUploadResponse:
    extension = body.filename.rsplit(".", 1)[-1].lower() if "." in body.filename else "mp4"
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        extension = "mp4"
    key = f"{_test_video_prefix(instructor.id)}{uuid.uuid4()}.{extension}"
    upload_url = await get_upload_url(key)
    return TestVideoUploadResponse(upload_url=upload_url, video_key=key)


@router.get("/test-video", response_model=list[TestVideoRequestRead])
@limiter.limit("60/minute")
async def list_test_video_requests(
    request: Request,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[TestVideoRequestRead]:
    result = await db.execute(
        select(InstructorTestVideoRequest)
        .where(InstructorTestVideoRequest.instructor_id == instructor.id)
        .order_by(InstructorTestVideoRequest.created_at.desc())
    )
    requests = result.scalars().all()
    return [
        TestVideoRequestRead(
            id=r.id,
            video_url=await get_download_url(r.video_url),
            note=r.note,
            status=r.status,
            feedback=r.feedback,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at,
        )
        for r in requests
    ]


@router.post("/test-video", response_model=TestVideoRequestRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_test_video_request(
    request: Request,
    body: TestVideoRequestCreate,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> TestVideoRequestRead:
    if not body.video_key.startswith(_test_video_prefix(instructor.id)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid video key")

    test_request = InstructorTestVideoRequest(
        instructor_id=instructor.id,
        video_url=body.video_key,
        note=body.note,
    )
    db.add(test_request)
    await db.commit()
    await db.refresh(test_request)
    return TestVideoRequestRead(
        id=test_request.id,
        video_url=await get_download_url(test_request.video_url),
        note=test_request.note,
        status=test_request.status,
        feedback=test_request.feedback,
        created_at=test_request.created_at,
        reviewed_at=test_request.reviewed_at,
    )


@router.get("/marketplace-insights", response_model=list[MarketplaceInsightRow])
@limiter.limit("30/minute")
async def get_marketplace_insights(
    request: Request,
    instructor: User = Depends(require_instructor),
    db: AsyncSession = Depends(get_db),
) -> list[MarketplaceInsightRow]:
    result = await db.execute(
        select(
            Category.id,
            Category.name,
            func.count(Course.id),
            func.coalesce(func.avg(Course.rating), 0),
            func.coalesce(func.avg(Course.price_in_cents), 0),
            func.coalesce(func.sum(Course.enrollment_count), 0),
        )
        .join(Course, Course.category_id == Category.id)
        .where(Course.status == "published")
        .group_by(Category.id, Category.name)
        .order_by(Category.name)
    )
    rows = result.all()

    currency_result = await db.execute(
        select(Course.category_id, Course.currency).where(
            Course.status == "published", Course.category_id.isnot(None)
        )
    )
    currency_by_category: dict[uuid.UUID, str] = {}
    for category_id, currency in currency_result.all():
        currency_by_category.setdefault(category_id, currency)

    return [
        MarketplaceInsightRow(
            category_id=category_id,
            category_name=category_name,
            course_count=course_count,
            average_rating=round(float(avg_rating), 2),
            average_price_cents=int(avg_price),
            currency=currency_by_category.get(category_id, "EUR"),
            total_enrollments=int(total_enrollments),
        )
        for category_id, category_name, course_count, avg_rating, avg_price, total_enrollments in rows
    ]
