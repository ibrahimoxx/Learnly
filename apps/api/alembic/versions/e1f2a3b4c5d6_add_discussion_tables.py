"""add discussion tables

Revision ID: e1f2a3b4c5d6
Revises: a3f9e2b1c4d7
Create Date: 2026-05-20 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "e1f2a3b4c5d6"
down_revision = "a3f9e2b1c4d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "discussion_posts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("is_pinned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_discussion_posts_course_id", "discussion_posts", ["course_id"])
    op.create_index("ix_discussion_posts_author_id", "discussion_posts", ["author_id"])

    op.create_table(
        "discussion_replies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "post_id",
            UUID(as_uuid=True),
            sa.ForeignKey("discussion_posts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("author_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_discussion_replies_post_id", "discussion_replies", ["post_id"])
    op.create_index("ix_discussion_replies_author_id", "discussion_replies", ["author_id"])


def downgrade() -> None:
    op.drop_index("ix_discussion_replies_author_id", table_name="discussion_replies")
    op.drop_index("ix_discussion_replies_post_id", table_name="discussion_replies")
    op.drop_table("discussion_replies")
    op.drop_index("ix_discussion_posts_author_id", table_name="discussion_posts")
    op.drop_index("ix_discussion_posts_course_id", table_name="discussion_posts")
    op.drop_table("discussion_posts")
