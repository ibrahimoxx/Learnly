import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CouponCreate(BaseModel):
    course_id: str | None = None
    code: str = Field(..., min_length=3, max_length=50)
    discount_type: Literal["percent", "fixed"]
    discount_value: int = Field(..., ge=1)
    max_uses: int | None = Field(None, ge=1)
    expires_at: datetime | None = None


class CouponRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID | None
    code: str
    discount_type: str
    discount_value: int
    max_uses: int | None
    uses_count: int
    expires_at: datetime | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CouponValidate(BaseModel):
    code: str
    course_id: str


class CouponValidateResult(BaseModel):
    valid: bool
    discount_type: str
    discount_value: int
    original_price_cents: int
    discounted_price_cents: int
    message: str
