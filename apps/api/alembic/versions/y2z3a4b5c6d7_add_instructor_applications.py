"""add instructor_applications table

Revision ID: y2z3a4b5c6d7
Revises: x1y2z3a4b5c6
Create Date: 2026-06-17 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "y2z3a4b5c6d7"
down_revision = "x1y2z3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "instructor_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", "withdrawn", name="instructor_application_status"), nullable=False, server_default="pending"),
        sa.Column("expertise", sa.Text, nullable=False),
        sa.Column("experience", sa.Text, nullable=False),
        sa.Column("course_ideas", sa.Text, nullable=False),
        sa.Column("motivation", sa.Text, nullable=False),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("linkedin", sa.String(255), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_instructor_applications_user_id", "instructor_applications", ["user_id"])
    op.create_index("ix_instructor_applications_status", "instructor_applications", ["status"])


def downgrade() -> None:
    op.drop_table("instructor_applications")
    op.execute("DROP TYPE IF EXISTS instructor_application_status CASCADE")
