import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AnswerRead(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    body: str
    created_at: datetime
    answers: list[AnswerRead] = []

    model_config = {"from_attributes": True}


class QuestionCreate(BaseModel):
    body: str = Field(..., min_length=5, max_length=2000)


class AnswerCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)
