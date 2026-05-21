"""add lesson unlock_at

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-21 02:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "f2a3b4c5d6e7"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lessons", sa.Column("unlock_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("lessons", "unlock_at")
