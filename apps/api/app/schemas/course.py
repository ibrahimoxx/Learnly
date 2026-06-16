import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.category import CategoryRead
from app.schemas.user import InstructorBriefRead


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=255)
    subtitle: str | None = Field(None, max_length=500)
    description: str | None = None
    level: str = "all"
    language: str = "en"
    is_free: bool = False
    price_in_cents: int = Field(0, ge=0)
    currency: str = "EUR"
    category_id: uuid.UUID | None = None


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=10, max_length=255)
    subtitle: str | None = Field(None, max_length=500)
    description: str | None = None
    image_url: str | None = None
    promo_video_url: str | None = None
    level: str | None = None
    language: str | None = None
    is_free: bool | None = None
    price_in_cents: int | None = Field(None, ge=0)
    currency: str | None = None
    category_id: uuid.UUID | None = None
    status: str | None = None
    learning_objectives: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: list[str] | None = None
    welcome_message: str | None = None
    completion_message: str | None = None
    image_alt_text: str | None = Field(None, max_length=500)


class CourseRead(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str | None
    description: str | None
    image_url: str | None
    promo_video_url: str | None
    level: str
    language: str
    status: str
    is_free: bool
    price_in_cents: int
    currency: str
    total_duration_seconds: int
    total_lessons: int
    rating: Decimal
    review_count: int
    enrollment_count: int
    instructor_id: uuid.UUID
    category_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    learning_objectives: list[str] | None = None
    prerequisites: list[str] | None = None
    target_audience: list[str] | None = None
    welcome_message: str | None = None
    completion_message: str | None = None
    image_alt_text: str | None = None

    model_config = {"from_attributes": True}


class CourseDetailRead(CourseRead):
    instructor: InstructorBriefRead | None = None
    category: CategoryRead | None = None


class CourseListRead(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str | None
    image_url: str | None
    level: str
    status: str
    is_free: bool
    price_in_cents: int
    currency: str
    rating: Decimal
    review_count: int
    enrollment_count: int
    instructor_id: uuid.UUID
    created_at: datetime
    category: CategoryRead | None = None

    model_config = {"from_attributes": True}


class PaginatedCourses(BaseModel):
    items: list[CourseListRead]
    total: int
    page: int
    limit: int
    total_pages: int
