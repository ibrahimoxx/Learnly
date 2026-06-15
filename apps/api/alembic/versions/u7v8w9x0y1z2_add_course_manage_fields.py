"""add_course_manage_fields

Revision ID: u7v8w9x0y1z2
Revises: t6u7v8w9x0y1
Create Date: 2026-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'u7v8w9x0y1z2'
down_revision: Union[str, None] = 't6u7v8w9x0y1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('courses', sa.Column('learning_objectives', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'))
    op.add_column('courses', sa.Column('prerequisites', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'))
    op.add_column('courses', sa.Column('target_audience', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'))
    op.add_column('courses', sa.Column('welcome_message', sa.Text(), nullable=True))
    op.add_column('courses', sa.Column('completion_message', sa.Text(), nullable=True))
    op.add_column('courses', sa.Column('image_alt_text', sa.String(length=500), nullable=True))
    op.add_column('lessons', sa.Column('captions_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('lessons', 'captions_url')
    op.drop_column('courses', 'image_alt_text')
    op.drop_column('courses', 'completion_message')
    op.drop_column('courses', 'welcome_message')
    op.drop_column('courses', 'target_audience')
    op.drop_column('courses', 'prerequisites')
    op.drop_column('courses', 'learning_objectives')
