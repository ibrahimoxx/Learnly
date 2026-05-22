"""add learning paths tables

Revision ID: l8m9n0o1p2q3
Revises: k7l8m9o0p1q2
Create Date: 2026-05-22 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "l8m9n0o1p2q3"
down_revision = "k7l8m9o0p1q2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_paths",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("instructor_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_learning_paths_instructor_id", "learning_paths", ["instructor_id"])
    op.create_index("ix_learning_paths_slug", "learning_paths", ["slug"], unique=True)

    op.create_table(
        "learning_path_courses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("path_id", UUID(as_uuid=True), sa.ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.SmallInteger, nullable=False, server_default="0"),
        sa.UniqueConstraint("path_id", "course_id", name="uq_lp_course"),
    )
    op.create_index("ix_learning_path_courses_path_id", "learning_path_courses", ["path_id"])
    op.create_index("ix_learning_path_courses_course_id", "learning_path_courses", ["course_id"])

    op.create_table(
        "learning_path_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("path_id", UUID(as_uuid=True), sa.ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "path_id", name="uq_lp_enrollment"),
    )
    op.create_index("ix_learning_path_enrollments_student_id", "learning_path_enrollments", ["student_id"])
    op.create_index("ix_learning_path_enrollments_path_id", "learning_path_enrollments", ["path_id"])


def downgrade() -> None:
    op.drop_table("learning_path_enrollments")
    op.drop_table("learning_path_courses")
    op.drop_table("learning_paths")
