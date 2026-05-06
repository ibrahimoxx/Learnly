import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.health import router as health_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.courses import router as courses_router
from app.api.v1.sections import router as sections_router
from app.api.v1.lessons import router as lessons_router
from app.api.v1.enrollments import router as enrollments_router
from app.core.config import settings

log = structlog.get_logger()

app = FastAPI(
    title="Learnly API",
    version="0.1.0",
    docs_url="/docs" if settings.node_env == "development" else None,
    redoc_url="/redoc" if settings.node_env == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["system"])
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
app.include_router(sections_router, prefix="/api/v1")
app.include_router(lessons_router, prefix="/api/v1")
app.include_router(enrollments_router, prefix="/api/v1")


@app.on_event("startup")
async def startup() -> None:
    log.info("learnly_api_started", env=settings.node_env)
