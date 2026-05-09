import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    promo_video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    level: Mapped[str] = mapped_column(
        Enum("beginner", "intermediate", "expert", "all", name="course_level"),
        nullable=False,
        default="all",
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    status: Mapped[str] = mapped_column(
        Enum("draft", "in_review", "published", "archived", name="course_status"),
        nullable=False,
        default="draft",
        index=True,
    )
    is_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    price_in_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    total_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_lessons: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=Decimal("0.00"))
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enrollment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    instructor: Mapped["User"] = relationship("User", back_populates="courses")  # type: ignore[name-defined]
    organization: Mapped["Organization | None"] = relationship("Organization", back_populates="courses")  # type: ignore[name-defined]
    category: Mapped["Category | None"] = relationship("Category", back_populates="courses")  # type: ignore[name-defined]
    sections: Mapped[list["Section"]] = relationship(  # type: ignore[name-defined]
        "Section", back_populates="course", cascade="all, delete-orphan", order_by="Section.position"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship("Enrollment", back_populates="course")  # type: ignore[name-defined]
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="course", cascade="all, delete-orphan")  # type: ignore[name-defined]
    coupons: Mapped[list["Coupon"]] = relationship("Coupon", back_populates="course", cascade="all, delete-orphan")  # type: ignore[name-defined]
