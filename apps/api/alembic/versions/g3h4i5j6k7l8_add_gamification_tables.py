"""add gamification tables

Revision ID: g3h4i5j6k7l8
Revises: f2a3b4c5d6e7
Create Date: 2026-05-21

"""
from alembic import op
import sqlalchemy as sa

revision = "g3h4i5j6k7l8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.create_table(
        "user_gamification",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("xp_total", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.Date, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_user_gamification_user_id", "user_gamification", ["user_id"])

    op.create_table(
        "badges",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("icon", sa.String(10), nullable=False),
        sa.Column("color", sa.String(30), nullable=False, server_default="gray"),
        sa.Column("rarity", sa.Text, nullable=False, server_default="common"),
        sa.Column("xp_reward", sa.Integer, nullable=False, server_default="0"),
    )
    op.execute("ALTER TABLE badges ALTER COLUMN rarity DROP DEFAULT")
    op.execute("ALTER TABLE badges ALTER COLUMN rarity TYPE badge_rarity USING rarity::badge_rarity")
    op.execute("ALTER TABLE badges ALTER COLUMN rarity SET DEFAULT 'common'::badge_rarity")
    op.create_index("ix_badges_code", "badges", ["code"])

    op.create_table(
        "user_badges",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("badge_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("badges.id", ondelete="CASCADE"), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
    op.create_index("ix_user_badges_user_id", "user_badges", ["user_id"])
    op.create_index("ix_user_badges_badge_id", "user_badges", ["badge_id"])

    op.execute("""
        INSERT INTO badges (id, code, name, description, icon, color, rarity, xp_reward) VALUES
        (gen_random_uuid(), 'first_step',        'First Step',        'Complete your first lesson',               '🎯', 'blue',   'common',   0),
        (gen_random_uuid(), 'curious_mind',      'Curious Mind',      'Complete 10 lessons',                      '🔍', 'teal',   'common',   0),
        (gen_random_uuid(), 'dedicated_learner', 'Dedicated Learner', 'Complete 25 lessons',                      '📚', 'indigo', 'uncommon', 0),
        (gen_random_uuid(), 'course_master',     'Course Master',     'Complete your first course',               '🏆', 'amber',  'uncommon', 0),
        (gen_random_uuid(), 'knowledge_seeker',  'Knowledge Seeker',  'Complete 3 courses',                       '🎓', 'purple', 'rare',     0),
        (gen_random_uuid(), 'week_warrior',      'Week Warrior',      'Maintain a 7-day learning streak',         '🔥', 'orange', 'uncommon', 50),
        (gen_random_uuid(), 'streak_legend',     'Streak Legend',     'Maintain a 30-day learning streak',        '⚡', 'yellow', 'epic',     0),
        (gen_random_uuid(), 'quiz_ace',          'Quiz Ace',          'Score 100% on any quiz',                   '💡', 'green',  'rare',     0)
    """)


def downgrade() -> None:
    op.drop_table("user_badges")
    op.drop_table("badges")
    op.drop_table("user_gamification")
    op.execute("DROP TYPE IF EXISTS badge_rarity")
