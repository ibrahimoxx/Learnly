import uuid

import httpx
import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.db.tables.user import User

log = structlog.get_logger()
bearer = HTTPBearer()
optional_bearer = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.clerk.com/v1/jwks",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        jwks = await _get_jwks()
        header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token key")
        payload = jwt.decode(token, key, algorithms=["RS256"])
        return payload
    except JWTError as e:
        log.warning("clerk_jwt_invalid", error=str(e))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(
    payload: dict = Depends(verify_clerk_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    clerk_id: str | None = payload.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing subject")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    clerk_role: str = (payload.get("public_metadata") or {}).get("role") or "student"

    if not user:
        # Webhook may not have fired yet — auto-provision on first API call
        email: str = (
            payload.get("email")
            or (payload.get("email_addresses") or [{}])[0].get("email_address", "")
            or f"{clerk_id}@unknown.local"
        )
        first_name: str = payload.get("first_name") or ""
        last_name: str = payload.get("last_name") or ""
        user = User(
            clerk_id=clerk_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=clerk_role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        log.info("user_auto_provisioned", clerk_id=clerk_id, email=email, role=clerk_role)
    elif clerk_role != "student" and user.role != clerk_role:
        # Clerk is source of truth — sync role changes that arrived via JWT
        user.role = clerk_role
        await db.commit()
        log.info("user_role_synced", clerk_id=clerk_id, role=clerk_role)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        jwks = await _get_jwks()
        header = jwt.get_unverified_header(credentials.credentials)
        key = next((k for k in jwks["keys"] if k["kid"] == header["kid"]), None)
        if not key:
            return None
        payload = jwt.decode(credentials.credentials, key, algorithms=["RS256"])
        clerk_id = payload.get("sub")
        if not clerk_id:
            return None
        result = await db.execute(select(User).where(User.clerk_id == clerk_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


async def require_instructor(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("instructor", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
