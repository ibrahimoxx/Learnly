import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AssignmentSubmissionCreate(BaseModel):
    content: str | None = Field(default=None, max_length=10000)
    file_url: str | None = Field(default=None, max_length=500)


class AssignmentSubmissionRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    course_id: uuid.UUID
    student_id: uuid.UUID
    content: str | None
    file_url: str | None
    status: str
    grade: int | None
    feedback: str | None
    submitted_at: datetime
    reviewed_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentSubmissionWithContext(AssignmentSubmissionRead):
    student_name: str
    student_email: str
    lesson_title: str
    course_title: str


class AssignmentGrade(BaseModel):
    grade: int = Field(ge=0, le=100)
    feedback: str = Field(min_length=1, max_length=5000)
