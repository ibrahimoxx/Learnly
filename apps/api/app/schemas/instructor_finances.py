import uuid
from datetime import datetime

from pydantic import BaseModel


class RevenueTransactionRow(BaseModel):
    enrollment_id: uuid.UUID
    course_id: uuid.UUID
    course_title: str
    student_name: str
    type: str
    amount_cents: int
    currency: str
    created_at: datetime


class RevenueReport(BaseModel):
    total_revenue_cents: int
    currency: str
    transaction_count: int
    transactions: list[RevenueTransactionRow]
