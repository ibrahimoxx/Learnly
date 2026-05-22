import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AffiliateLinkRead(BaseModel):
    id: uuid.UUID
    code: str
    commission_pct: int
    click_count: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AffiliateLinkUpdate(BaseModel):
    is_active: bool | None = None
    commission_pct: int | None = Field(None, ge=1, le=100)


class AffiliateStatsRead(BaseModel):
    link: AffiliateLinkRead
    total_conversions: int
    total_revenue_cents: int
    total_commission_cents: int
    pending_commission_cents: int


class AffiliateConversionRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    amount_cents: int
    commission_cents: int
    status: Literal["pending", "paid"]
    created_at: datetime

    model_config = {"from_attributes": True}
