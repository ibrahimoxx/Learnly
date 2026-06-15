import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class CoInstructorInvite(BaseModel):
    email: EmailStr
    can_manage_content: bool = False
    can_respond_qa: bool = False
    can_respond_reviews: bool = False
    can_view_revenue: bool = False
    revenue_share_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class CoInstructorUpdate(BaseModel):
    can_manage_content: bool | None = None
    can_respond_qa: bool | None = None
    can_respond_reviews: bool | None = None
    can_view_revenue: bool | None = None
    revenue_share_percent: Decimal | None = Field(default=None, ge=0, le=100)


class CoInstructorRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str
    can_manage_content: bool
    can_respond_qa: bool
    can_respond_reviews: bool
    can_view_revenue: bool
    revenue_share_percent: Decimal
    status: str
    invited_at: datetime
    accepted_at: datetime | None
