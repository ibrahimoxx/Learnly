import uuid
from datetime import datetime

from pydantic import BaseModel


class AdminOrgRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    clerk_org_id: str
    is_active: bool
    course_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminOrgStatusUpdate(BaseModel):
    is_active: bool
