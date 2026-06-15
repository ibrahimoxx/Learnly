import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SupportTicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)


class SupportTicketReplyCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class SupportTicketStatusUpdate(BaseModel):
    status: str = Field(pattern="^(open|in_progress|resolved|closed)$")


class SupportTicketReplyRead(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    author_role: str
    author_name: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SupportTicketRead(BaseModel):
    id: uuid.UUID
    subject: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SupportTicketDetail(SupportTicketRead):
    message: str
    user_id: uuid.UUID
    user_name: str
    user_email: str
    replies: list[SupportTicketReplyRead]
