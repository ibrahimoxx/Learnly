"""add course embeddings with pgvector

Revision ID: i5j6k7l8m9o0
Revises: h4i5j6k7l8m9
Create Date: 2026-05-21 14:00:00.000000

"""
from alembic import op

revision = "i5j6k7l8m9o0"
down_revision = "h4i5j6k7l8m9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS embedding vector(1536)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_courses_embedding_hnsw "
        "ON courses USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_courses_embedding_hnsw")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS embedding")
