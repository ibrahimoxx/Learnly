import uuid
from datetime import datetime

from pydantic import BaseModel


class BadgeRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    code: str
    name: str
    description: str
    icon: str
    color: str
    rarity: str
    xp_reward: int


class UserBadgeRead(BaseModel):
    model_config = {"from_attributes": True}

    badge: BadgeRead
    earned_at: datetime


class GamificationStats(BaseModel):
    xp_total: int
    level: int
    xp_to_next_level: int
    current_streak: int
    longest_streak: int
    badges: list[UserBadgeRead]
