import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr


class UserRead(BaseModel):
    id: uuid.UUID
    clerk_id: str
    email: EmailStr
    first_name: str
    last_name: str
    image_url: str | None
    role: str
    bio: str | None
    website: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    bio: str | None = None
    website: str | None = None
    image_url: str | None = None


class UserRoleUpdate(BaseModel):
    role: str


class InstructorBriefRead(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    image_url: str | None

    model_config = {"from_attributes": True}


class InstructorProfileRead(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    image_url: str | None
    bio: str | None
    website: str | None
    created_at: datetime
    total_courses: int
    total_students: int
    avg_rating: Decimal
    total_reviews: int

    model_config = {"from_attributes": True}
