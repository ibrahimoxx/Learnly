"""resize course embedding to 768 dims (nomic-embed-text / Ollama)

Revision ID: j6k7l8m9o0p1
Revises: i5j6k7l8m9o0
Create Date: 2026-05-21 15:00:00.000000

Phase 3 uses Ollama nomic-embed-text (768 dims).
Phase 4: create migration to resize to vector(1536) for OpenAI text-embedding-3-small.
"""
from alembic import op

revision = "j6k7l8m9o0p1"
down_revision = "i5j6k7l8m9o0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_courses_embedding_hnsw")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE courses ADD COLUMN embedding vector(768)")
    op.execute(
        "CREATE INDEX ix_courses_embedding_hnsw "
        "ON courses USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_courses_embedding_hnsw")
    op.execute("ALTER TABLE courses DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE courses ADD COLUMN embedding vector(1536)")
    op.execute(
        "CREATE INDEX ix_courses_embedding_hnsw "
        "ON courses USING hnsw (embedding vector_cosine_ops)"
    )
