import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.tables  # noqa: F401 — registers all models with SQLAlchemy mapper
from app.api.v1.health import router as health_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.courses import router as courses_router
from app.api.v1.sections import router as sections_router
from app.api.v1.lessons import router as lessons_router
from app.api.v1.enrollments import router as enrollments_router
from app.api.v1.checkout import router as checkout_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.questions import router as questions_router
from app.api.v1.wishlist import router as wishlist_router
from app.api.v1.coupons import router as coupons_router
from app.api.v1.payouts import router as payouts_router
from app.api.v1.admin import router as admin_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.discussions import router as discussions_router
from app.api.v1.gamification import router as gamification_router
from app.api.v1.push import router as push_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.learning_paths import router as learning_paths_router
from app.api.v1.affiliate import router as affiliate_router
from app.core.config import settings

log = structlog.get_logger()

if settings.sentry_dsn_backend:
    sentry_sdk.init(
        dsn=settings.sentry_dsn_backend,
        traces_sample_rate=0.1,
        environment=settings.node_env,
    )

app = FastAPI(
    title="Learnly API",
    version="0.1.0",
    docs_url="/docs" if settings.node_env == "development" else None,
    redoc_url="/redoc" if settings.node_env == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url],
    allow_origin_regex=r"https?://([a-z0-9-]+\.)?(localhost)(:\d+)?" if settings.node_env == "development" else None,
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
app.include_router(checkout_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(questions_router, prefix="/api/v1")
app.include_router(wishlist_router, prefix="/api/v1")
app.include_router(coupons_router, prefix="/api/v1")
app.include_router(payouts_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(organizations_router, prefix="/api/v1")
app.include_router(quiz_router, prefix="/api/v1")
app.include_router(discussions_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(push_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(learning_paths_router, prefix="/api/v1")
app.include_router(affiliate_router, prefix="/api/v1")


@app.on_event("startup")
async def startup() -> None:
    log.info("learnly_api_started", env=settings.node_env)
