import uuid

from pydantic import BaseModel


class MonthlyRevenuePoint(BaseModel):
    month: str
    revenue_cents: int


class TopCourseRevenue(BaseModel):
    course_id: uuid.UUID
    title: str
    instructor_name: str
    revenue_cents: int
    enrollment_count: int


class TopInstructorRevenue(BaseModel):
    instructor_id: uuid.UUID
    name: str
    email: str
    revenue_cents: int
    course_count: int


class AdminRevenueReport(BaseModel):
    total_revenue_cents: int
    currency: str
    transaction_count: int
    monthly_revenue: list[MonthlyRevenuePoint]
    top_courses: list[TopCourseRevenue]
    top_instructors: list[TopInstructorRevenue]


class AdminPayoutRow(BaseModel):
    instructor_id: uuid.UUID
    name: str
    email: str
    stripe_connected: bool
    total_revenue_cents: int
    currency: str
    course_count: int
