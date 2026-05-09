import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    clerk_org_id: str
    name: str
    slug: str
    logo_url: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None


class OrganizationRead(BaseModel):
    id: uuid.UUID
    clerk_org_id: str
    name: str
    slug: str
    logo_url: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgStats(BaseModel):
    total_courses: int = Field(default=0)
    total_members: int = Field(default=0)
