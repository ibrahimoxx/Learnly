import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=5000)


class AnnouncementRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    title: str
    body: str
    recipient_count: int
    created_at: datetime
