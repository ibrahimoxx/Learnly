import uuid

from pydantic import BaseModel, Field


class AdminCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100)
    parent_id: uuid.UUID | None = None


class AdminCategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, min_length=1, max_length=100)
    parent_id: uuid.UUID | None = None


class AdminCategoryRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    parent_id: uuid.UUID | None
    course_count: int
    subcategories: list["AdminCategoryRead"] = []

    model_config = {"from_attributes": True}
