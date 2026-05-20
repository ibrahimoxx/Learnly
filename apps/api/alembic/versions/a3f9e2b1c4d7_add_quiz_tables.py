"""add_quiz_tables

Revision ID: a3f9e2b1c4d7
Revises: df527dfdc4e6
Create Date: 2026-05-20 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a3f9e2b1c4d7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'quiz_questions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('correct_index', sa.SmallInteger(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('position', sa.SmallInteger(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quiz_questions_lesson_id', 'quiz_questions', ['lesson_id'], unique=False)

    op.create_table(
        'quiz_attempts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('lesson_id', sa.UUID(), nullable=False),
        sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('score', sa.SmallInteger(), nullable=False),
        sa.Column('total', sa.SmallInteger(), nullable=False),
        sa.Column('passed', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quiz_attempts_student_lesson', 'quiz_attempts', ['student_id', 'lesson_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_quiz_attempts_student_lesson', table_name='quiz_attempts')
    op.drop_table('quiz_attempts')
    op.drop_index('ix_quiz_questions_lesson_id', table_name='quiz_questions')
    op.drop_table('quiz_questions')
