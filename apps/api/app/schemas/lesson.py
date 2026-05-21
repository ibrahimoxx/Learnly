import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    type: str = "video"
    content: str | None = None
    video_url: str | None = None
    duration_seconds: int | None = None
    position: int = Field(0, ge=0)
    is_free_preview: bool = False
    is_downloadable: bool = False
    unlock_at: datetime | None = None


class LessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    content: str | None = None
    video_url: str | None = None
    duration_seconds: int | None = None
    position: int | None = Field(None, ge=0)
    is_free_preview: bool | None = None
    is_downloadable: bool | None = None
    unlock_at: datetime | None = None


class LessonRead(BaseModel):
    id: uuid.UUID
    section_id: uuid.UUID
    title: str
    type: str
    content: str | None
    video_url: str | None
    duration_seconds: int | None
    position: int
    is_free_preview: bool
    is_downloadable: bool
    unlock_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class VideoUploadURL(BaseModel):
    upload_url: str
    key: str
