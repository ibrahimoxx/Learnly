import uuid

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.db.tables.course import Course

log = structlog.get_logger()


async def generate_course_embedding(course_id: uuid.UUID, db: AsyncSession) -> None:
    course = await db.get(Course, course_id)
    if not course:
        return

    text = " ".join(filter(None, [course.title, course.subtitle, course.description]))
    if not text.strip():
        return

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/embeddings",
                json={"model": settings.ollama_embed_model, "prompt": text[:8000]},
            )
            resp.raise_for_status()
            course.embedding = resp.json()["embedding"]
        await db.commit()
        log.info("course_embedded", course_id=str(course_id))
    except Exception as exc:
        log.warning("embed_failed", course_id=str(course_id), error=str(exc))


# ── Phase 4: switch to OpenAI ────────────────────────────────────────────────
# Comment out the Ollama block above, uncomment below, set OPENAI_API_KEY env.
#
# async def generate_course_embedding(course_id: uuid.UUID, db: AsyncSession) -> None:
#     if not settings.openai_api_key:
#         return
#     course = await db.get(Course, course_id)
#     if not course:
#         return
#     text = " ".join(filter(None, [course.title, course.subtitle, course.description]))
#     if not text.strip():
#         return
#     try:
#         from openai import AsyncOpenAI
#         client = AsyncOpenAI(api_key=settings.openai_api_key)
#         response = await client.embeddings.create(
#             model="text-embedding-3-small", input=text[:8000]
#         )
#         course.embedding = response.data[0].embedding
#         await db.commit()
#         log.info("course_embedded", course_id=str(course_id))
#     except Exception as exc:
#         log.warning("embed_failed", course_id=str(course_id), error=str(exc))
# ────────────────────────────────────────────────────────────────────────────


async def _run_embed(course_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await generate_course_embedding(uuid.UUID(course_id), db)
