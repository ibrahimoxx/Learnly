"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { PlayCircle, Award, BookOpen, Download, Flame, Zap, Medal, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
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

  const active = enrollments.filter((e) => e.status === "active");
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[--color-text-primary]">My Learning</h1>

      {stats && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${stats.current_streak > 0 ? "border-orange-200 bg-orange-50 text-orange-700" : "border-[--color-border] bg-[--color-surface] text-[--color-text-muted]"}`}>
            <Flame className="h-4 w-4" />
            {stats.current_streak} day streak
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[--color-border] bg-[--color-surface] px-3 py-1.5 text-sm font-semibold text-[--color-text-secondary]">
            <Zap className="h-4 w-4 text-[--color-primary]" />
            <span>Lv.{stats.level}</span>
            <div className="w-20">
              <Progress value={((100 - stats.xp_to_next_level) / 100) * 100} className="h-1.5" />
            </div>
            <span className="text-xs text-[--color-text-muted]">{stats.xp_total} XP</span>
          </div>
          <Link
            href="/achievements"
            className="flex items-center gap-1.5 rounded-full border border-[--color-border] bg-[--color-surface] px-3 py-1.5 text-sm font-semibold text-[--color-text-secondary] hover:border-[--color-primary] transition-colors"
          >
            <Medal className="h-4 w-4 text-[--color-star]" />
            {stats.badges.length} badges
          </Link>
          {stats.badges.length > 0 && (
            <div className="flex items-center gap-1">
              {stats.badges.slice(0, 4).map((ub) => (
                <span key={ub.badge.id} title={ub.badge.name} className="flex h-7 w-7 items-center justify-center rounded-full border border-[--color-border] bg-white text-sm">
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
              const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id));
              const completedInPath = path.courses.filter(
                (c) => enrollments.find((e) => e.course_id === c.id && e.status === "completed")
              ).length;
              const total = path.courses.length;
              const pct = total > 0 ? Math.round((completedInPath / total) * 100) : 0;
              return (
                <Link
                  key={path.id}
                  href={`/paths/${path.slug}`}
                  className="flex items-start gap-3 rounded-[--radius-md] border border-[--color-border] bg-white p-4 hover:border-[--color-primary] transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary]/10">
                    <GraduationCap className="h-5 w-5 text-[--color-primary]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-[--color-text-primary]">{path.title}</p>
                    <p className="mt-0.5 text-xs text-[--color-text-muted]">{completedInPath}/{total} courses completed</p>
                    <Progress value={pct} className="mt-2 h-1.5" />
                  </div>
                </Link>
              );
              void enrolledCourseIds;
            })}
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="active">In Progress ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[--radius-md] border border-[--color-border] overflow-hidden">
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
      </Tabs>

      <div className="mt-10">
        <RecommendationsSection />
      </div>
    </div>
  );
}

function EnrollmentGrid({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] bg-white py-16 text-center">
        <BookOpen className="h-12 w-12 text-[--color-border]" />
        <p className="mt-3 font-semibold text-[--color-text-secondary]">No courses here yet</p>
        <p className="mt-1 text-sm text-[--color-text-muted]">Browse the catalog to find something you love.</p>
        <Link
          href="/courses"
          className="mt-4 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
        >
          Explore courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enrollment) => (
        <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
      ))}
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const { getToken } = useAuth();
  const isCompleted = enrollment.status === "completed";

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
    <div className="overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-white">
      {/* Placeholder thumbnail */}
      <div className="relative aspect-video bg-linear-to-br from-[--color-primary]/10 to-[--color-primary]/5 flex items-center justify-center">
        {isCompleted ? (
          <Award className="h-12 w-12 text-[--color-star]" />
        ) : (
          <PlayCircle className="h-12 w-12 text-[--color-primary]/40" />
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <Badge variant="success">Completed</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        {enrollment.course_title && (
          <p className="text-sm font-semibold text-[--color-text-primary] mb-1 line-clamp-2">{enrollment.course_title}</p>
        )}
        <p className="text-xs text-[--color-text-muted] mb-1">
          Enrolled {new Date(enrollment.created_at).toLocaleDateString()}
        </p>

        {!isCompleted && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[--color-text-muted] mb-1">
              <span>Progress</span>
              <span>
                {enrollment.completed_lessons ?? 0}/{enrollment.total_lessons ?? 0} lessons
              </span>
            </div>
            <Progress
              value={
                (enrollment.total_lessons ?? 0) > 0
                  ? Math.round(((enrollment.completed_lessons ?? 0) / (enrollment.total_lessons ?? 1)) * 100)
                  : 0
              }
            />
          </div>
        )}

        {isCompleted && enrollment.completed_at && (
          <p className="mt-2 text-xs text-[--color-success]">
            Completed {new Date(enrollment.completed_at).toLocaleDateString()}
          </p>
        )}

        <Link
          href={`/learn/${enrollment.course_slug || enrollment.course_id}`}
          className="mt-3 block w-full rounded-[--radius-sm] border border-[--color-primary] py-2 text-center text-xs font-semibold text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors"
        >
          {isCompleted ? "Review course" : "Continue learning"}
        </Link>
        {isCompleted && (
          <button
            onClick={downloadCertificate}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-[--radius-sm] border border-[--color-border] py-2 text-xs font-semibold text-[--color-text-secondary] hover:border-[--color-star] hover:text-[--color-star] transition-colors"
          >
            <Download className="h-3 w-3" /> Download Certificate
          </button>
        )}
      </div>
    </div>
  );
}
