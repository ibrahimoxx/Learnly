"""add attempt_number to quiz_attempts

Revision ID: k7l8m9o0p1q2
Revises: j6k7l8m9o0p1
Create Date: 2026-05-21 21:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "k7l8m9o0p1q2"
down_revision = "j6k7l8m9o0p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_attempts",
        sa.Column("attempt_number", sa.SmallInteger(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("quiz_attempts", "attempt_number")
