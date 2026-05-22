import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EnrollmentCreate(BaseModel):
    course_id: uuid.UUID
    affiliate_code: str | None = Field(None, max_length=20, pattern=r"^[A-Z0-9]+$")


class EnrollmentRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    status: str
    completed_at: datetime | None
    created_at: datetime
    completed_lessons: int = 0
    total_lessons: int = 0

    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    lesson_id: uuid.UUID
    watched_seconds: int
    last_position_seconds: int
    is_completed: bool = False


class ProgressRead(BaseModel):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    lesson_id: uuid.UUID
    is_completed: bool
    watched_seconds: int
    last_position_seconds: int
    completed_at: datetime | None

    model_config = {"from_attributes": True}
