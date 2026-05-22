import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.schemas.course import CourseListRead


class LearningPathCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    slug: str = Field(..., min_length=3, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None
    image_url: str | None = None

    @field_validator("image_url", mode="before")
    @classmethod
    def validate_image_url(cls, v: object) -> object:
        if v is None:
            return v
        try:
            HttpUrl(str(v))
        except Exception:
            raise ValueError("image_url must be a valid HTTP/HTTPS URL")
        return str(v)


class LearningPathUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    description: str | None = None
    image_url: str | None = None
    status: Literal["draft", "published"] | None = None

    @field_validator("image_url", mode="before")
    @classmethod
    def validate_image_url(cls, v: object) -> object:
        if v is None:
            return v
        try:
            HttpUrl(str(v))
        except Exception:
            raise ValueError("image_url must be a valid HTTP/HTTPS URL")
        return str(v)


class LearningPathCourseAdd(BaseModel):
    course_id: uuid.UUID
    position: int = Field(0, ge=0, le=32767)


class LearningPathRead(BaseModel):
    id: uuid.UUID
    instructor_id: uuid.UUID
    title: str
    slug: str
    description: str | None
    image_url: str | None
    status: str
    course_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class LearningPathDetail(LearningPathRead):
    courses: list[CourseListRead]
    enrolled_count: int = 0


class LearningPathProgress(BaseModel):
    path_id: uuid.UUID
    completed_courses: int
    total_courses: int
    enrolled: bool
