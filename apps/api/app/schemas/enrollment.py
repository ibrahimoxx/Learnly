import uuid
from datetime import datetime

from pydantic import BaseModel


class EnrollmentCreate(BaseModel):
    course_id: uuid.UUID


class EnrollmentRead(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    status: str
    completed_at: datetime | None
    created_at: datetime

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
