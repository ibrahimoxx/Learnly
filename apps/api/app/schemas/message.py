import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class MessageUserBrief(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    image_url: str | None
    role: str

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    recipient_id: uuid.UUID
    course_id: uuid.UUID | None = None
    body: str = Field(min_length=1, max_length=5000)


class MessageRead(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    course_id: uuid.UUID | None
    body: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationRead(BaseModel):
    participant: MessageUserBrief
    last_message: MessageRead
    unread_count: int
