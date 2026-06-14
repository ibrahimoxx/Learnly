"""add_account_settings

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-06-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 's5t6u7v8w9x0'
down_revision: Union[str, None] = 'r4s5t6u7v8w9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('timezone', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('is_profile_public', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('users', sa.Column('email_notification_prefs', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.add_column('enrollments', sa.Column('amount_paid_cents', sa.Integer(), nullable=True))
    op.add_column('enrollments', sa.Column('currency', sa.String(length=3), nullable=True))

    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('sender_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_id', sa.UUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.UUID(), sa.ForeignKey('courses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])
    op.create_index('ix_messages_recipient_id', 'messages', ['recipient_id'])
    op.create_index('ix_messages_recipient_id_is_read', 'messages', ['recipient_id', 'is_read'])


def downgrade() -> None:
    op.drop_index('ix_messages_recipient_id_is_read', table_name='messages')
    op.drop_index('ix_messages_recipient_id', table_name='messages')
    op.drop_index('ix_messages_sender_id', table_name='messages')
    op.drop_table('messages')

    op.drop_column('enrollments', 'currency')
    op.drop_column('enrollments', 'amount_paid_cents')

    op.drop_column('users', 'email_notification_prefs')
    op.drop_column('users', 'is_profile_public')
    op.drop_column('users', 'timezone')
