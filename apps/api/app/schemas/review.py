import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=2000)


class ReviewRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    student_id: uuid.UUID
    rating: int
    comment: str | None
    student_name: str
    course_title: str | None = None
    instructor_response: str | None = None
    instructor_response_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewRespond(BaseModel):
    response: str = Field(..., min_length=1, max_length=2000)
