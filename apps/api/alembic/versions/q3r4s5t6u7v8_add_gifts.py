"""add_gifts

Revision ID: q3r4s5t6u7v8
Revises: o1p2q3r4s5t6
Create Date: 2026-06-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'q3r4s5t6u7v8'
down_revision: Union[str, None] = 'o1p2q3r4s5t6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'gifts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gifts_sender_id', 'gifts', ['sender_id'], unique=False)
    op.create_index('ix_gifts_recipient_id', 'gifts', ['recipient_id'], unique=False)
    op.create_index('ix_gifts_course_id', 'gifts', ['course_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_gifts_course_id', table_name='gifts')
    op.drop_index('ix_gifts_recipient_id', table_name='gifts')
    op.drop_index('ix_gifts_sender_id', table_name='gifts')
    op.drop_table('gifts')
