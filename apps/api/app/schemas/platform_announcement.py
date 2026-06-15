import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PlatformAnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=5000)
    audience: str = Field(default="all", pattern="^(all|students|instructors)$")
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class PlatformAnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1, max_length=5000)
    audience: str | None = Field(default=None, pattern="^(all|students|instructors)$")
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class PlatformAnnouncementRead(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    audience: str
    is_active: bool
    starts_at: datetime | None
    ends_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
