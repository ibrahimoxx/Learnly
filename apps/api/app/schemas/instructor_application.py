import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InstructorApplicationCreate(BaseModel):
    expertise: str = Field(..., min_length=20, max_length=1000)
    experience: str = Field(..., min_length=20, max_length=2000)
    course_ideas: str = Field(..., min_length=20, max_length=2000)
    motivation: str = Field(..., min_length=20, max_length=2000)
    website: str | None = Field(None, max_length=255)
    linkedin: str | None = Field(None, max_length=255)


class ApplicantRead(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    image_url: str | None

    model_config = {"from_attributes": True}


class InstructorApplicationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    expertise: str
    experience: str
    course_ideas: str
    motivation: str
    website: str | None
    linkedin: str | None
    rejection_reason: str | None
    reviewed_at: datetime | None
    created_at: datetime
    applicant: ApplicantRead | None = None

    model_config = {"from_attributes": True}


class InstructorApplicationReject(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)
