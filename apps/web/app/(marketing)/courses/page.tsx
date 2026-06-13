import type { Metadata } from "next";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import { getViewerEnrollmentCourseIds } from "@/lib/server/enrollments";
import type { CourseListResponse } from "@/types";

export const metadata: Metadata = { title: "All Courses" };

interface Props {
  searchParams: Promise<{ q?: string; category?: string; level?: string; page?: string }>;
}

async function getCourses(params: { q?: string; category?: string; level?: string; page?: string }) {
  const searchParams = new URLSearchParams({ status: "published", limit: "24" });
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.level) searchParams.set("level", params.level);
  if (params.page) searchParams.set("page", params.page);

  try {
    return await apiFetch<CourseListResponse>(`/api/v1/courses?${searchParams}`);
  } catch {
    return { items: [], total: 0, page: 1, per_page: 24 };
  }
}

const LEVELS = [
  { value: "", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [{ items, total }, ownedCourseIds] = await Promise.all([
    getCourses(params),
    getViewerEnrollmentCourseIds(),
  ]);
  const ownedCourseIdSet = new Set(ownedCourseIds);

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mx-auto mb-8 max-w-7xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Course catalog
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary] sm:text-5xl">
          {params.q ? `Results for "${params.q}"` : "All Courses"}
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {total.toLocaleString()} courses available
        </p>
      </div>

      {/* Mobile level chips */}
      <div className="mx-auto mb-4 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden" style={{ scrollbarWidth: "none" }}>
        {LEVELS.map((level) => (
          <a
            key={level.value}
            href={`/courses?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(level.value ? { level: level.value } : {}) })}`}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-extrabold shadow-[var(--shadow-xs)] transition-colors ${
              (params.level ?? "") === level.value
                ? "border-[--color-primary] bg-[--color-primary] text-white"
                : "border-[--color-border] bg-[--color-surface-raised] text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary]"
            }`}
          >
            {level.label}
          </a>
        ))}
      </div>

      <div className="mx-auto flex max-w-7xl gap-8">
        {/* Filters sidebar — desktop only */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="premium-card sticky top-24 rounded-[--radius-lg] p-4">
            <p className="relative mb-3 text-sm font-extrabold text-[--color-text-primary]">Level</p>
            <div className="relative space-y-1">
              {LEVELS.map((level) => (
                <a
                  key={level.value}
                  href={`/courses?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(level.value ? { level: level.value } : {}) })}`}
                  className={`flex min-h-11 items-center rounded-[--radius-sm] px-3 text-sm font-bold transition-colors ${
                    (params.level ?? "") === level.value
                      ? "bg-[--color-primary-subtle] text-[--brand-800]"
                      : "text-[--color-text-secondary] hover:bg-[--color-surface]"
                  }`}
                >
                  {level.label}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Course grid */}
        <div className="flex-1">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
              {items.map((course) => (
                <CourseCard key={course.id} course={course} isOwned={ownedCourseIdSet.has(course.id)} />
              ))}
            </div>
          ) : (
            <div className="premium-card flex flex-col items-center justify-center rounded-[--radius-lg] py-20 text-center">
              <img src="/brand/empty-state.svg" alt="" className="mb-4 h-32 w-auto" />
              <p className="relative text-base font-extrabold text-[--color-text-secondary]">No courses found</p>
              <p className="mt-1 text-sm text-[--color-text-muted]">
                {params.q ? `Try a different search term.` : "Check back soon — new courses are added regularly."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
