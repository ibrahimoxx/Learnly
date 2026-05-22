"""add_live_sessions

Revision ID: o1p2q3r4s5t6
Revises: n0o1p2q3r4s5
Create Date: 2026-05-22 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'o1p2q3r4s5t6'
down_revision: Union[str, None] = 'n0o1p2q3r4s5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'live_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('instructor_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('room_name', sa.Text(), nullable=False),
        sa.Column('status', sa.Text(), nullable=False, server_default='scheduled'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['instructor_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('room_name', name='uq_live_sessions_room_name'),
    )
    op.create_index('ix_live_sessions_course_id', 'live_sessions', ['course_id'], unique=False)
    op.create_index('ix_live_sessions_instructor_id', 'live_sessions', ['instructor_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_live_sessions_instructor_id', table_name='live_sessions')
    op.drop_index('ix_live_sessions_course_id', table_name='live_sessions')
    op.drop_table('live_sessions')
