"""add affiliate tables

Revision ID: m9n0o1p2q3r4
Revises: l8m9n0o1p2q3
Create Date: 2026-05-22 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "m9n0o1p2q3r4"
down_revision = "l8m9n0o1p2q3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "affiliate_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "instructor_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("code", sa.String(20), unique=True, nullable=False),
        sa.Column("commission_pct", sa.SmallInteger(), nullable=False, server_default="30"),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliate_links_code", "affiliate_links", ["code"])
    op.create_check_constraint(
        "ck_affiliate_links_commission_pct",
        "affiliate_links",
        "commission_pct >= 1 AND commission_pct <= 100",
    )

    op.create_table(
        "affiliate_conversions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "link_id",
            UUID(as_uuid=True),
            sa.ForeignKey("affiliate_links.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "enrollment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("enrollments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "course_id",
            UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("commission_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliate_conversions_link_id", "affiliate_conversions", ["link_id"])
    op.create_index("ix_affiliate_conversions_course_id", "affiliate_conversions", ["course_id"])
    op.create_index("ix_affiliate_conversions_student_id", "affiliate_conversions", ["student_id"])
    op.create_index("ix_affiliate_conversions_link_created", "affiliate_conversions", ["link_id", "created_at"])


def downgrade() -> None:
    op.drop_table("affiliate_conversions")
    op.drop_table("affiliate_links")
