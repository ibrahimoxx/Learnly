"""add_notes

Revision ID: t6u7v8w9x0y1
Revises: s5t6u7v8w9x0
Create Date: 2026-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 't6u7v8w9x0y1'
down_revision: Union[str, None] = 's5t6u7v8w9x0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notes',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('student_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', sa.UUID(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.UUID(), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('timestamp_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_notes_student_id', 'notes', ['student_id'])
    op.create_index('ix_notes_lesson_id', 'notes', ['lesson_id'])
    op.create_index('ix_notes_course_id', 'notes', ['course_id'])


def downgrade() -> None:
    op.drop_index('ix_notes_course_id', table_name='notes')
    op.drop_index('ix_notes_lesson_id', table_name='notes')
    op.drop_index('ix_notes_student_id', table_name='notes')
    op.drop_table('notes')
