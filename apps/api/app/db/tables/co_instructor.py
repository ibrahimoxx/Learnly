import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseCoInstructor(Base):
    __tablename__ = "course_co_instructors"
    __table_args__ = (UniqueConstraint("course_id", "user_id", name="uq_co_instructor_course_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    can_manage_content: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_respond_qa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_respond_reviews: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_view_revenue: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revenue_share_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0"))
    status: Mapped[str] = mapped_column(
        Enum("pending", "active", "removed", name="co_instructor_status"),
        nullable=False,
        default="pending",
    )
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    course: Mapped["Course"] = relationship("Course")  # type: ignore[name-defined]
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
