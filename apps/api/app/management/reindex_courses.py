"""
Reindex all published courses into Meilisearch.

Run from project root:
  cd d:/Learnly
  python apps/api/app/management/reindex_courses.py
"""

import asyncio
import os
import sys
from pathlib import Path

import meilisearch
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

load_dotenv(Path(__file__).parent.parent.parent / ".env.local")     # apps/api/.env.local
load_dotenv(Path(__file__).parent.parent.parent.parent.parent / ".env.local")  # project root

DATABASE_URL = os.getenv("DATABASE_URL")
MEILI_URL = os.getenv("MEILI_URL", "http://localhost:7700")
MEILI_MASTER_KEY = os.getenv("MEILI_MASTER_KEY", "")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    sys.exit(1)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

INDEX_NAME = "courses"


async def fetch_courses(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        text("""
            SELECT
                c.id::text,
                c.slug,
                c.title,
                c.subtitle,
                c.description,
                c.level,
                c.language,
                c.is_free,
                c.price_in_cents,
                c.rating,
                c.review_count,
                c.enrollment_count,
                c.image_url,
                cat.name  AS category_name,
                cat.slug  AS category_slug,
                u.first_name || ' ' || u.last_name AS instructor_name,
                u.clerk_id AS instructor_clerk_id
            FROM courses c
            LEFT JOIN categories cat ON cat.id = c.category_id
            LEFT JOIN users u ON u.id = c.instructor_id
            WHERE c.status = 'published'
        """)
    )
    rows = result.mappings().all()
    return [dict(r) for r in rows]


def build_document(row: dict) -> dict:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "subtitle": row["subtitle"] or "",
        "description": (row["description"] or "")[:500],
        "level": row["level"],
        "language": row["language"],
        "is_free": row["is_free"],
        "price_in_cents": row["price_in_cents"],
        "rating": float(row["rating"]) if row["rating"] else 0.0,
        "review_count": row["review_count"] or 0,
        "enrollment_count": row["enrollment_count"] or 0,
        "image_url": row["image_url"] or "",
        "category_name": row["category_name"] or "",
        "category_slug": row["category_slug"] or "",
        "instructor_name": row["instructor_name"] or "",
    }


async def main() -> None:
    print("\n=== Meilisearch Course Reindex ===\n")

    async with AsyncSessionLocal() as session:
        print("Fetching published courses from DB...")
        courses = await fetch_courses(session)
        print(f"  {len(courses)} courses found")

    documents = [build_document(r) for r in courses]

    client = meilisearch.Client(MEILI_URL, MEILI_MASTER_KEY)

    index = client.index(INDEX_NAME)

    # Configure filterable + searchable attributes
    index.update_filterable_attributes([
        "level", "language", "is_free", "category_slug",
        "price_in_cents", "rating",
    ])
    index.update_sortable_attributes(["rating", "enrollment_count", "price_in_cents"])
    index.update_searchable_attributes([
        "title", "subtitle", "description",
        "instructor_name", "category_name",
    ])

    print(f"Indexing {len(documents)} documents into '{INDEX_NAME}'...")
    task = index.add_documents(documents)
    print(f"  Task queued: uid={task.task_uid}")

    # Wait for indexing to complete
    client.wait_for_task(task.task_uid, timeout_in_ms=30000)
    print(f"  Done — {len(documents)} courses indexed into Meilisearch.")
    print(f"\nSearch at: {MEILI_URL}")


if __name__ == "__main__":
    asyncio.run(main())
