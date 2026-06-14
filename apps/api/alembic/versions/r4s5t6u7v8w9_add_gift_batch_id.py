"""add_gift_batch_id

Revision ID: r4s5t6u7v8w9
Revises: q3r4s5t6u7v8
Create Date: 2026-06-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'r4s5t6u7v8w9'
down_revision: Union[str, None] = 'q3r4s5t6u7v8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('gifts', sa.Column('batch_id', sa.UUID(), nullable=True))
    op.create_index('ix_gifts_batch_id', 'gifts', ['batch_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_gifts_batch_id', table_name='gifts')
    op.drop_column('gifts', 'batch_id')
