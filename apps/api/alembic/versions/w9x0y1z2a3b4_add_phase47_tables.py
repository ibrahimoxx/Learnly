"""add_phase47_tables

Revision ID: w9x0y1z2a3b4
Revises: v8w9x0y1z2a3
Create Date: 2026-06-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'w9x0y1z2a3b4'
down_revision: Union[str, None] = 'v8w9x0y1z2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'course_announcements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('instructor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_course_announcements_course_id', 'course_announcements', ['course_id'])
    op.create_index('ix_course_announcements_instructor_id', 'course_announcements', ['instructor_id'])

    op.create_table(
        'assignment_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lesson_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('status', sa.Enum('submitted', 'reviewed', name='assignment_submission_status'), nullable=False, server_default='submitted'),
        sa.Column('grade', sa.Integer(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('student_id', 'lesson_id', name='uq_assignment_submission_student_lesson'),
    )
    op.create_index('ix_assignment_submissions_lesson_id', 'assignment_submissions', ['lesson_id'])
    op.create_index('ix_assignment_submissions_student_id', 'assignment_submissions', ['student_id'])
    op.create_index('ix_assignment_submissions_course_id', 'assignment_submissions', ['course_id'])

    op.create_table(
        'instructor_test_video_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('instructor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('video_url', sa.String(500), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'reviewed', name='test_video_request_status'), nullable=False, server_default='pending'),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_instructor_test_video_requests_instructor_id', 'instructor_test_video_requests', ['instructor_id'])

    op.create_table(
        'course_co_instructors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('can_manage_content', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('can_respond_qa', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('can_respond_reviews', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('can_view_revenue', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('revenue_share_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('pending', 'active', 'removed', name='co_instructor_status'), nullable=False, server_default='pending'),
        sa.Column('invited_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('course_id', 'user_id', name='uq_co_instructor_course_user'),
    )
    op.create_index('ix_course_co_instructors_course_id', 'course_co_instructors', ['course_id'])
    op.create_index('ix_course_co_instructors_user_id', 'course_co_instructors', ['user_id'])


def downgrade() -> None:
    op.drop_table('course_co_instructors')
    op.execute('DROP TYPE IF EXISTS co_instructor_status')

    op.drop_table('instructor_test_video_requests')
    op.execute('DROP TYPE IF EXISTS test_video_request_status')

    op.drop_table('assignment_submissions')
    op.execute('DROP TYPE IF EXISTS assignment_submission_status')

    op.drop_table('course_announcements')
