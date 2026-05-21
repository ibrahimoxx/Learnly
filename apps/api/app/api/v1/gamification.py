from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.db.tables.user import User
from app.schemas.gamification import GamificationStats
from app.services.gamification import get_user_gamification

router = APIRouter(tags=["gamification"])


@router.get("/gamification/me", response_model=GamificationStats)
async def get_my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GamificationStats:
    return await get_user_gamification(user.id, db)
