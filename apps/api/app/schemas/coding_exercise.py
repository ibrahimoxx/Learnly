import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class TestCase(BaseModel):
    input: str
    expected_output: str


class CodingExerciseWrite(BaseModel):
    language_id: int = Field(..., ge=1)
    problem_statement: str = Field(..., min_length=1)
    starter_code: str = ""
    test_cases: list[TestCase] = Field(default_factory=list)


class CodingExerciseRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    language_id: int
    problem_statement: str
    starter_code: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CodingExerciseInstructorRead(CodingExerciseRead):
    test_cases: list[TestCase]


class CodeSubmitRequest(BaseModel):
    source_code: str = Field(..., min_length=1)
    language_id: int = Field(..., ge=1)


class TestCaseResult(BaseModel):
    index: int
    passed: bool
    stdout: str | None
    expected: str
    time_ms: int | None
    memory_kb: int | None


class CodeSubmissionRead(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    status: str
    tests_passed: int
    tests_total: int
    stdout: str | None
    stderr: str | None
    time_ms: int | None
    memory_kb: int | None
    attempt_number: int
    results: list[TestCaseResult] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}
