import uuid
from datetime import date, datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.tables.enrollment import Enrollment
from app.db.tables.gamification import Badge, UserBadge, UserGamification
from app.db.tables.lesson_progress import LessonProgress
from app.db.tables.notification import Notification
from app.db.tables.quiz import QuizAttempt
from app.db.tables.section import Section
from app.schemas.gamification import GamificationStats, UserBadgeRead

log = structlog.get_logger()


async def get_or_create_stats(user_id: uuid.UUID, db: AsyncSession) -> UserGamification:
    result = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = UserGamification(user_id=user_id)
        db.add(stats)
        await db.flush()
    return stats


def _update_streak(stats: UserGamification) -> None:
    today = date.today()
    last = stats.last_activity_date

    if last is None:
        stats.current_streak = 1
    elif last == today:
        return
    elif (today - last).days == 1:
        stats.current_streak += 1
    else:
        stats.current_streak = 1

    if stats.current_streak > stats.longest_streak:
        stats.longest_streak = stats.current_streak

    stats.last_activity_date = today


def _award_xp(stats: UserGamification, amount: int) -> None:
    stats.xp_total += amount


async def _check_and_award_badges(
    user_id: uuid.UUID, stats: UserGamification, db: AsyncSession
) -> list[tuple[str, str]]:
    earned_result = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user_id)
    )
    earned_badge_ids = {row[0] for row in earned_result}

    all_badges_result = await db.execute(select(Badge))
    all_badges = all_badges_result.scalars().all()

    completed_lessons_result = await db.execute(
        select(func.count(LessonProgress.id))
        .join(Enrollment, LessonProgress.enrollment_id == Enrollment.id)
        .where(Enrollment.student_id == user_id, LessonProgress.is_completed == True)  # noqa: E712
    )
    completed_lessons = completed_lessons_result.scalar_one() or 0

    completed_courses_result = await db.execute(
        select(func.count(Enrollment.id))
        .where(Enrollment.student_id == user_id, Enrollment.status == "completed")
    )
    completed_courses = completed_courses_result.scalar_one() or 0

    perfect_quiz_result = await db.execute(
        select(func.count(QuizAttempt.id))
        .where(
            QuizAttempt.student_id == user_id,
            QuizAttempt.score == QuizAttempt.total,
            QuizAttempt.total > 0,
        )
    )
    has_perfect_quiz = (perfect_quiz_result.scalar_one() or 0) > 0

    criteria_met: dict[str, bool] = {
        "first_step":        completed_lessons >= 1,
        "curious_mind":      completed_lessons >= 10,
        "dedicated_learner": completed_lessons >= 25,
        "course_master":     completed_courses >= 1,
        "knowledge_seeker":  completed_courses >= 3,
        "week_warrior":      stats.current_streak >= 7,
        "streak_legend":     stats.current_streak >= 30,
        "quiz_ace":          has_perfect_quiz,
    }

    new_badges: list[tuple[str, str]] = []

    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue
        if not criteria_met.get(badge.code, False):
            continue

        user_badge = UserBadge(user_id=user_id, badge_id=badge.id)
        db.add(user_badge)

        notification = Notification(
            user_id=user_id,
            type="badge_earned",
            title=f"Badge unlocked: {badge.name}",
            body=badge.description,
        )
        db.add(notification)

        if badge.xp_reward > 0:
            _award_xp(stats, badge.xp_reward)

        new_badges.append((badge.name, badge.description))
        log.info("badge_earned", user_id=str(user_id), badge_code=badge.code)

    return new_badges


async def process_lesson_completion(user_id: uuid.UUID, db: AsyncSession) -> None:
    from app.services.push import schedule_push  # local import avoids circular dep

    stats = await get_or_create_stats(user_id, db)
    _update_streak(stats)
    _award_xp(stats, 10)
    new_badges = await _check_and_award_badges(user_id, stats, db)
    await db.commit()
    for badge_name, badge_desc in new_badges:
        schedule_push(user_id, f"Badge unlocked: {badge_name}", badge_desc, "/achievements")


async def process_course_completion(user_id: uuid.UUID, db: AsyncSession) -> None:
    from app.services.push import schedule_push

    stats = await get_or_create_stats(user_id, db)
    _update_streak(stats)
    _award_xp(stats, 100)
    new_badges = await _check_and_award_badges(user_id, stats, db)
    await db.commit()
    for badge_name, badge_desc in new_badges:
        schedule_push(user_id, f"Badge unlocked: {badge_name}", badge_desc, "/achievements")


async def process_quiz_pass(user_id: uuid.UUID, db: AsyncSession) -> None:
    from app.services.push import schedule_push

    stats = await get_or_create_stats(user_id, db)
    _update_streak(stats)
    _award_xp(stats, 25)
    new_badges = await _check_and_award_badges(user_id, stats, db)
    await db.commit()
    for badge_name, badge_desc in new_badges:
        schedule_push(user_id, f"Badge unlocked: {badge_name}", badge_desc, "/achievements")


async def get_user_gamification(user_id: uuid.UUID, db: AsyncSession) -> GamificationStats:
    stats = await get_or_create_stats(user_id, db)
    await db.commit()

    badges_result = await db.execute(
        select(UserBadge)
        .options(selectinload(UserBadge.badge))
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at)
    )
    user_badges = badges_result.scalars().all()

    level = stats.xp_total // 100 + 1
    xp_in_level = stats.xp_total % 100
    xp_to_next = 100 - xp_in_level

    return GamificationStats(
        xp_total=stats.xp_total,
        level=level,
        xp_to_next_level=xp_to_next,
        current_streak=stats.current_streak,
        longest_streak=stats.longest_streak,
        badges=[UserBadgeRead.model_validate(ub) for ub in user_badges],
    )
