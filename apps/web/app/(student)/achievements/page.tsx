import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Flame, Zap, Calendar, ChevronLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api";
import type { GamificationStats } from "@/types";

const ALL_BADGES = [
  { code: "first_step",        name: "First Step",        icon: "🎯", description: "Complete your first lesson",        rarity: "common" },
  { code: "curious_mind",      name: "Curious Mind",      icon: "🔍", description: "Complete 10 lessons",               rarity: "common" },
  { code: "dedicated_learner", name: "Dedicated Learner", icon: "📚", description: "Complete 25 lessons",               rarity: "uncommon" },
  { code: "course_master",     name: "Course Master",     icon: "🏆", description: "Complete your first course",        rarity: "uncommon" },
  { code: "knowledge_seeker",  name: "Knowledge Seeker",  icon: "🎓", description: "Complete 3 courses",               rarity: "rare" },
  { code: "week_warrior",      name: "Week Warrior",      icon: "🔥", description: "Maintain a 7-day learning streak",  rarity: "uncommon" },
  { code: "streak_legend",     name: "Streak Legend",     icon: "⚡", description: "Maintain a 30-day learning streak", rarity: "epic" },
  { code: "quiz_ace",          name: "Quiz Ace",          icon: "💡", description: "Score 100% on any quiz",            rarity: "rare" },
] as const;

const RARITY_COLORS: Record<string, string> = {
  common:   "text-slate-500  border-slate-200  bg-slate-50",
  uncommon: "text-indigo-600 border-indigo-200 bg-indigo-50",
  rare:     "text-purple-600 border-purple-200 bg-purple-50",
  epic:     "text-amber-600  border-amber-200  bg-amber-50",
  legendary:"text-red-600    border-red-200    bg-red-50",
};

export default async function AchievementsPage() {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = (await getToken()) ?? "";
  let stats: GamificationStats | null = null;
  try {
    stats = await apiFetch<GamificationStats>("/api/v1/gamification/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    stats = null;
  }

  const earnedCodes = new Set(stats?.badges.map((ub) => ub.badge.code) ?? []);
  const earnedMap = new Map(stats?.badges.map((ub) => [ub.badge.code, ub]) ?? []);

  const xpInLevel = (stats?.xp_total ?? 0) % 100;
  const xpProgress = xpInLevel;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
          <ChevronLeft className="h-4 w-4" />
          My Learning
        </Link>
        <span className="text-[--color-border]">/</span>
        <span className="text-sm font-semibold text-[--color-text-primary]">Achievements</span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 text-center shadow-[var(--shadow-xs)] hover-lift">
          <Zap className="mx-auto h-6 w-6 text-[--color-primary] mb-1" />
          <p className="text-2xl font-bold text-[--color-text-primary]">{stats?.level ?? 1}</p>
          <p className="text-xs text-[--color-text-muted]">Level</p>
        </div>
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 text-center shadow-[var(--shadow-xs)] hover-lift">
          <Trophy className="mx-auto h-6 w-6 text-[--color-star] mb-1" />
          <p className="text-2xl font-bold text-[--color-text-primary]">{stats?.xp_total ?? 0}</p>
          <p className="text-xs text-[--color-text-muted]">Total XP</p>
        </div>
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 text-center shadow-[var(--shadow-xs)] hover-lift">
          <Flame className="mx-auto h-6 w-6 text-orange-500 mb-1" />
          <p className="text-2xl font-bold text-[--color-text-primary]">{stats?.current_streak ?? 0}</p>
          <p className="text-xs text-[--color-text-muted]">Day streak</p>
        </div>
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 text-center shadow-[var(--shadow-xs)] hover-lift">
          <Calendar className="mx-auto h-6 w-6 text-teal-500 mb-1" />
          <p className="text-2xl font-bold text-[--color-text-primary]">{stats?.longest_streak ?? 0}</p>
          <p className="text-xs text-[--color-text-muted]">Best streak</p>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mt-6 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 shadow-[var(--shadow-xs)]">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-[--color-text-primary]">Level {stats?.level ?? 1}</span>
          <span className="text-[--color-text-muted]">{xpInLevel} / 100 XP to next level</span>
        </div>
        <Progress value={xpProgress} />
      </div>

      {/* Badge grid */}
      <h2 className="mt-8 text-lg font-bold text-[--color-text-primary]">
        Badges ({earnedCodes.size} / {ALL_BADGES.length})
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ALL_BADGES.map((badge) => {
          const earned = earnedCodes.has(badge.code);
          const userBadge = earnedMap.get(badge.code);
          const rarityClass = earned ? (RARITY_COLORS[badge.rarity] ?? RARITY_COLORS.common) : "text-slate-300 border-slate-100 bg-slate-50";

          return (
            <div
              key={badge.code}
              className={`rounded-[--radius-md] border p-4 text-center transition-all ${rarityClass} ${earned ? "shadow-sm" : "opacity-60 grayscale"}`}
            >
              <span className={`text-4xl ${!earned ? "opacity-30" : ""}`}>{earned ? badge.icon : "❓"}</span>
              <p className="mt-2 text-sm font-semibold leading-snug">{badge.name}</p>
              <p className="mt-0.5 text-xs opacity-70 leading-snug">{badge.description}</p>
              {earned && userBadge && (
                <p className="mt-2 text-[10px] opacity-60">
                  {new Date(userBadge.earned_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${earned ? "opacity-80" : "opacity-40"}`}>
                {badge.rarity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
