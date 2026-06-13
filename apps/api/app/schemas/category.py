import uuid

from pydantic import BaseModel


class CategoryRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class CategoryWithCount(CategoryRead):
    course_count: int
