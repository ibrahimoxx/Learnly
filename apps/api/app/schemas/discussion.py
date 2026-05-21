import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DiscussionReplyCreate(BaseModel):
    body: str = Field(..., min_length=5, max_length=2000)


class DiscussionReplyRead(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscussionPostCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    body: str = Field(..., min_length=5, max_length=5000)


class DiscussionPostRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str
    title: str
    body: str
    is_pinned: bool
    created_at: datetime
    replies: list[DiscussionReplyRead] = []

    model_config = {"from_attributes": True}
