import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SectionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    objective: str | None = None
    position: int = Field(0, ge=0)


class SectionUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    objective: str | None = None
    position: int | None = Field(None, ge=0)


class SectionRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    objective: str | None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}
