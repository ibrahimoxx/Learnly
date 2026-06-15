import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, field_validator


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
    timezone: str | None = None
    is_profile_public: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    bio: str | None = None
    website: str | None = None
    image_url: str | None = None
    timezone: str | None = None

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return value
        if not value.startswith("https://"):
            raise ValueError("image_url must be an https:// URL")
        return value


class UserRoleUpdate(BaseModel):
    role: str


class EmailNotificationPrefs(BaseModel):
    enrollment: bool = True
    qa_reply: bool = True
    review: bool = True
    gift: bool = True
    announcement: bool = True
    message: bool = True
    marketing: bool = True


class UserPrivacyRead(BaseModel):
    is_profile_public: bool
    email_notification_prefs: EmailNotificationPrefs


class UserPrivacyUpdate(BaseModel):
    is_profile_public: bool | None = None
    email_notification_prefs: EmailNotificationPrefs | None = None


class SubscriptionRead(BaseModel):
    plan: str
    status: str
    description: str
    renews_at: datetime | None = None


class PurchaseHistoryItem(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    course_slug: str
    amount_cents: int
    currency: str
    is_gift_purchase: bool
    purchased_at: datetime

    model_config = {"from_attributes": True}


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
