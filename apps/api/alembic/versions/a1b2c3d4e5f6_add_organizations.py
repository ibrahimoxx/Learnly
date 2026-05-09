"""add_organizations

Revision ID: a1b2c3d4e5f6
Revises: df527dfdc4e6
Create Date: 2026-05-10

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "df527dfdc4e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("clerk_org_id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clerk_org_id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_clerk_org_id", "organizations", ["clerk_org_id"])
    op.create_index("ix_organizations_slug", "organizations", ["slug"])

    op.add_column(
        "courses",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_courses_organization_id",
        "courses",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_courses_organization_id", "courses", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_courses_organization_id", "courses")
    op.drop_constraint("fk_courses_organization_id", "courses", type_="foreignkey")
    op.drop_column("courses", "organization_id")

    op.drop_index("ix_organizations_slug", "organizations")
    op.drop_index("ix_organizations_clerk_org_id", "organizations")
    op.drop_table("organizations")
