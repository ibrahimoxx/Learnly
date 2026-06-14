import uuid
from datetime import datetime

from pydantic import BaseModel


class GiftCourseInfo(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    image_url: str | None

    model_config = {"from_attributes": True}


class GiftUserInfo(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}


class GiftRead(BaseModel):
    id: uuid.UUID
    course: GiftCourseInfo
    other_user: GiftUserInfo
    message: str | None
    created_at: datetime
    courses: list[GiftCourseInfo] | None = None


class GiftListRead(BaseModel):
    sent: list[GiftRead]
    received: list[GiftRead]
