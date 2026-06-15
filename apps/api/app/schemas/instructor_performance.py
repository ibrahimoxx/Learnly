import uuid
from datetime import datetime

from pydantic import BaseModel


class CourseRevenueRow(BaseModel):
    course_id: uuid.UUID
    title: str
    enrollment_count: int
    revenue_cents: int
    currency: str
    rating: float
    review_count: int


class MonthlyRevenuePoint(BaseModel):
    month: str
    revenue_cents: int


class PerformanceOverview(BaseModel):
    total_revenue_cents: int
    currency: str
    total_students: int
    total_courses: int
    average_rating: float
    monthly_revenue: list[MonthlyRevenuePoint]
    courses: list[CourseRevenueRow]


class StudentRow(BaseModel):
    student_id: uuid.UUID
    name: str
    email: str
    course_id: uuid.UUID
    course_title: str
    enrolled_at: datetime
    progress_percent: float
    last_activity_at: datetime | None


class EngagementRow(BaseModel):
    course_id: uuid.UUID
    title: str
    total_students: int
    completed_students: int
    completion_rate: float
    total_watch_minutes: int
    average_progress_percent: float


class TrafficRow(BaseModel):
    course_id: uuid.UUID
    title: str
    wishlist_count: int
    enrollment_count: int
    conversion_rate: float
