"""add_coding_exercises

Revision ID: n0o1p2q3r4s5
Revises: m9n0o1p2q3r4
Create Date: 2026-05-22 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'n0o1p2q3r4s5'
down_revision: Union[str, None] = 'm9n0o1p2q3r4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'coding_exercises',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('language_id', sa.SmallInteger(), nullable=False),
        sa.Column('problem_statement', sa.Text(), nullable=False),
        sa.Column('starter_code', sa.Text(), nullable=False, server_default=''),
        sa.Column('test_cases', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lesson_id', name='uq_coding_exercises_lesson_id'),
    )
    op.create_index('ix_coding_exercises_lesson_id', 'coding_exercises', ['lesson_id'], unique=True)

    op.create_table(
        'code_submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('language_id', sa.SmallInteger(), nullable=False),
        sa.Column('judge0_token', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default='pending'),
        sa.Column('stdout', sa.Text(), nullable=True),
        sa.Column('stderr', sa.Text(), nullable=True),
        sa.Column('time_ms', sa.Integer(), nullable=True),
        sa.Column('memory_kb', sa.Integer(), nullable=True),
        sa.Column('tests_passed', sa.SmallInteger(), nullable=False, server_default='0'),
        sa.Column('tests_total', sa.SmallInteger(), nullable=False, server_default='0'),
        sa.Column('attempt_number', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lesson_id', 'student_id', 'attempt_number', name='uq_submission_attempt'),
    )
    op.create_index('ix_code_submissions_lesson_student', 'code_submissions', ['lesson_id', 'student_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_code_submissions_lesson_student', table_name='code_submissions')
    op.drop_table('code_submissions')
    op.drop_index('ix_coding_exercises_lesson_id', table_name='coding_exercises')
    op.drop_table('coding_exercises')
