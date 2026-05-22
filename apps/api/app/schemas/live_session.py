import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LiveSessionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    scheduled_at: datetime | None = None


class LiveSessionRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    instructor_id: uuid.UUID
    title: str
    room_name: str
    status: str
    scheduled_at: datetime | None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LiveSessionToken(BaseModel):
    token: str
    url: str
    room_name: str
