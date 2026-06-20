"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { PlayCircle, Award, BookOpen, Download, Flame, Zap, Medal, GraduationCap, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { normalizeYtThumbnail } from "@/lib/utils";
import { RecommendationsSection } from "@/components/features/courses/recommendations-section";
import type { Enrollment, GamificationStats, LearningPathDetail } from "@/types";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [myPaths, setMyPaths] = useState<LearningPathDetail[]>([]);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const [data, gamification, paths] = await Promise.all([
          apiFetch<Enrollment[]>("/api/v1/enrollments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<GamificationStats>("/api/v1/gamification/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<LearningPathDetail[]>("/api/v1/learning-paths/my-paths", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => [] as LearningPathDetail[]),
        ]);
        setEnrollments(data);
        setStats(gamification);
        setMyPaths(paths);
      } catch {
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const [tabsMounted, setTabsMounted] = useState(false);
  useEffect(() => { setTabsMounted(true); }, []);

  const active = enrollments.filter((e) => e.status === "active");
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
      <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
        Student studio
      </span>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary] sm:text-5xl">My Learning</h1>

      {stats && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-extrabold shadow-[var(--shadow-xs)] ${stats.current_streak > 0 ? "border-[--color-warning]/30 bg-[--color-warning]/12 text-[--color-warning]" : "border-[--color-border] bg-[--color-surface-raised] text-[--color-text-muted]"}`}>
            <Flame className="h-4 w-4" />
            {stats.current_streak} day streak
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[--color-border] bg-[--color-surface-raised] px-3 py-1.5 text-sm font-extrabold text-[--color-text-secondary] shadow-[var(--shadow-xs)]">
            <Zap className="h-4 w-4 text-[--color-primary]" />
            <span>Lv.{stats.level}</span>
            <div className="w-20">
              <Progress value={((100 - stats.xp_to_next_level) / 100) * 100} className="h-1.5" />
            </div>
            <span className="text-xs text-[--color-text-muted]">{stats.xp_total} XP</span>
          </div>
          <Link
            href="/achievements"
            className="flex items-center gap-1.5 rounded-full border border-[--color-border] bg-[--color-surface-raised] px-3 py-1.5 text-sm font-extrabold text-[--color-text-secondary] shadow-[var(--shadow-xs)] hover:border-[--color-primary] transition-colors"
          >
            <Medal className="h-4 w-4 text-[--color-star]" />
            {stats.badges.length} badges
          </Link>
          {stats.badges.length > 0 && (
            <div className="flex items-center gap-1">
              {stats.badges.slice(0, 4).map((ub) => (
                <span key={ub.badge.id} title={ub.badge.name} className="flex h-7 w-7 items-center justify-center rounded-full border border-[--color-border] bg-[--color-surface-raised] text-sm shadow-[var(--shadow-xs)]">
                  {ub.badge.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {myPaths.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[--color-text-primary] flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[--color-primary]" />
              My Learning Paths
            </h2>
            <Link href="/paths" className="text-xs text-[--color-primary] hover:underline">Browse paths</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myPaths.map((path) => {
              const completedInPath = path.courses.filter(
                (c) => enrollments.find((e) => e.course_id === c.id && e.status === "completed")
              ).length;
              const total = path.courses.length;
              const pct = total > 0 ? Math.round((completedInPath / total) * 100) : 0;
              return (
                <Link
                  key={path.id}
                  href={`/paths/${path.slug}`}
                  className="hover-lift premium-card flex items-start gap-3 rounded-[--radius-md] p-4 hover:border-[--color-primary]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary-subtle]">
                    <GraduationCap className="h-5 w-5 text-[--color-primary]" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[--color-text-primary]">{path.title}</p>
                    <p className="mt-0.5 text-xs text-[--color-text-muted]">{completedInPath}/{total} courses completed</p>
                    <Progress value={pct} className="mt-2 h-1.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tabsMounted && <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="active">In Progress ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="premium-card rounded-[--radius-md]">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <EnrollmentGrid enrollments={enrollments} />
            </TabsContent>
            <TabsContent value="active">
              <EnrollmentGrid enrollments={active} />
            </TabsContent>
            <TabsContent value="completed">
              <EnrollmentGrid enrollments={completed} />
            </TabsContent>
          </>
        )}
      </Tabs>}

      <div className="mt-10">
        <RecommendationsSection />
      </div>
      </div>
    </div>
  );
}

function EnrollmentGrid({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="premium-card mt-8 flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
        <img src="/brand/empty-state.svg" alt="" className="mb-4 h-32 w-auto" />
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]"><BookOpen className="h-7 w-7 text-[--color-primary]" /></span>
        <p className="mt-3 font-semibold text-[--color-text-secondary]">No courses here yet</p>
        <p className="mt-1 text-sm text-[--color-text-muted]">Browse the catalog to find something you love.</p>
        <Link
          href="/courses"
          className="mt-4 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 transition-all"
        >
          Explore courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
      {enrollments.map((enrollment) => (
        <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
      ))}
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const { getToken } = useAuth();
  const isCompleted = enrollment.status === "completed";
  const progress =
    (enrollment.total_lessons ?? 0) > 0
      ? Math.round(((enrollment.completed_lessons ?? 0) / (enrollment.total_lessons ?? 1)) * 100)
      : 0;

  async function downloadCertificate() {
    const token = await getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/enrollments/${enrollment.id}/certificate`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${enrollment.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="group hover-lift premium-card overflow-hidden rounded-[--radius-lg]">
      {/* Thumbnail */}
      <Link href={`/courses/${enrollment.course_slug}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[--brand-700] via-[--brand-600] to-[--color-primary]">
          {enrollment.course_image_url ? (
            <Image
              src={normalizeYtThumbnail(enrollment.course_image_url ?? "")}
              alt={enrollment.course_title ?? "Course"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="rounded-[--radius-md] border border-white/20 bg-white/10 px-4 py-2 text-4xl font-black tracking-tight text-white backdrop-blur">
                {(enrollment.course_title ?? "??").slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          {isCompleted ? (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[--color-success] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
              <Award className="h-2.5 w-2.5" />
              Completed
            </div>
          ) : progress > 0 ? (
            <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
              {progress}% done
            </div>
          ) : null}

          {/* Play button overlay on hover */}
          {!isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur">
                <PlayCircle className="h-7 w-7 text-[--color-primary]" />
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Card body */}
      <div className="p-4">
        <Link href={`/courses/${enrollment.course_slug}`} className="block group/title">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[--color-text-primary] transition-colors group-hover/title:text-[--color-primary]">
            {enrollment.course_title ?? "Course"}
          </h3>
        </Link>

        <p className="mt-1 text-[11px] text-[--color-text-muted]">
          Since {new Date(enrollment.created_at).toLocaleDateString()}
        </p>

        {!isCompleted && (enrollment.total_lessons ?? 0) > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-[--color-text-muted]">
              <span>{enrollment.completed_lessons ?? 0} / {enrollment.total_lessons ?? 0} lessons</span>
              <span className="font-bold text-[--color-primary]">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--color-border]">
              <div
                className="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {isCompleted && enrollment.completed_at && (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[--color-success]">
            <Award className="h-3 w-3" />
            Completed {new Date(enrollment.completed_at).toLocaleDateString()}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/courses/${enrollment.course_slug}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-3 py-2 text-xs font-extrabold text-white shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5"
          >
            {isCompleted ? "Review course" : progress > 0 ? "Continue" : "Start learning"}
            <ChevronRight className="h-3 w-3" />
          </Link>
          {isCompleted && (
            <button
              onClick={downloadCertificate}
              title="Download certificate"
              className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] border border-[--color-border] text-[--color-text-muted] transition-all hover:border-[--color-star] hover:text-[--color-star]"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
