import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    options: list[str] = Field(..., min_length=2, max_length=4)
    correct_index: int = Field(..., ge=0, le=3)
    explanation: str | None = None
    position: int = Field(0, ge=0)


class QuizQuestionUpdate(BaseModel):
    question_text: str | None = Field(None, min_length=1)
    options: list[str] | None = Field(None, min_length=2, max_length=4)
    correct_index: int | None = Field(None, ge=0, le=3)
    explanation: str | None = None
    position: int | None = Field(None, ge=0)


class QuizQuestionRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    question_text: str
    options: list[str]
    explanation: str | None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuizQuestionInstructorRead(QuizQuestionRead):
    correct_index: int


class QuizSubmitRequest(BaseModel):
    answers: list[int | None]


class QuizQuestionResult(BaseModel):
    question_id: uuid.UUID
    selected_index: int | None
    correct_index: int
    is_correct: bool
    explanation: str | None


class QuizAttemptRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    score: int
    total: int
    passed: bool
    answers: list[int | None]
    results: list[QuizQuestionResult]
    created_at: datetime

    model_config = {"from_attributes": True}
