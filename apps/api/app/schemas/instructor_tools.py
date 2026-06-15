import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TestVideoUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)


class TestVideoUploadResponse(BaseModel):
    upload_url: str
    video_key: str


class TestVideoRequestCreate(BaseModel):
    video_key: str = Field(min_length=1, max_length=500)
    note: str | None = Field(default=None, max_length=2000)


class TestVideoRequestRead(BaseModel):
    id: uuid.UUID
    video_url: str
    note: str | None
    status: str
    feedback: str | None
    created_at: datetime
    reviewed_at: datetime | None


class MarketplaceInsightRow(BaseModel):
    category_id: uuid.UUID
    category_name: str
    course_count: int
    average_rating: float
    average_price_cents: int
    currency: str
    total_enrollments: int
