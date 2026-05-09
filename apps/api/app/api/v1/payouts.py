import stripe
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.db.tables.user import User
from app.integrations import stripe_client as _stripe_init  # noqa: F401

log = structlog.get_logger()
router = APIRouter(prefix="/payouts", tags=["payouts"])


class ConnectOnboardingResponse(BaseModel):
    onboarding_url: str


class ConnectStatusResponse(BaseModel):
    connected: bool
    stripe_account_id: str | None
    charges_enabled: bool
    payouts_enabled: bool


@router.post("/connect/onboard", response_model=ConnectOnboardingResponse)
async def start_connect_onboarding(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectOnboardingResponse:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructors only")

    if not settings.stripe_connect_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe Connect not configured")

    try:
        if user.stripe_account_id:
            account_id = user.stripe_account_id
        else:
            account = stripe.Account.create(
                type="express",
                email=user.email,
                metadata={"user_id": str(user.id)},
            )
            account_id = account.id
            user.stripe_account_id = account_id
            await db.commit()

        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{settings.app_url}/instructor/payouts?refresh=1",
            return_url=f"{settings.app_url}/instructor/payouts?success=1",
            type="account_onboarding",
        )
        return ConnectOnboardingResponse(onboarding_url=link.url)
    except stripe.StripeError as e:
        log.error("stripe_connect_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Stripe error")


@router.get("/connect/status", response_model=ConnectStatusResponse)
async def get_connect_status(
    user: User = Depends(get_current_user),
) -> ConnectStatusResponse:
    if not user.stripe_account_id:
        return ConnectStatusResponse(
            connected=False,
            stripe_account_id=None,
            charges_enabled=False,
            payouts_enabled=False,
        )
    try:
        account = stripe.Account.retrieve(user.stripe_account_id)
        return ConnectStatusResponse(
            connected=True,
            stripe_account_id=user.stripe_account_id,
            charges_enabled=account.charges_enabled,
            payouts_enabled=account.payouts_enabled,
        )
    except stripe.StripeError:
        return ConnectStatusResponse(
            connected=False,
            stripe_account_id=user.stripe_account_id,
            charges_enabled=False,
            payouts_enabled=False,
        )
