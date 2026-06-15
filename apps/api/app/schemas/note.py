import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    timestamp_seconds: int | None = Field(default=None, ge=0)


class NoteUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class NoteRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    course_id: uuid.UUID
    content: str
    timestamp_seconds: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteWithContext(NoteRead):
    lesson_title: str
    course_title: str
    course_slug: str
