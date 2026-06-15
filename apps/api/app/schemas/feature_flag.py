import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FeatureFlagRead(BaseModel):
    id: uuid.UUID
    key: str
    label: str
    description: str | None
    is_enabled: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeatureFlagCreate(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=255)
    description: str | None = None
    is_enabled: bool = False


class FeatureFlagUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    is_enabled: bool | None = None
