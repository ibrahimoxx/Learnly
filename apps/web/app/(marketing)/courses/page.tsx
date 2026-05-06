import type { Metadata } from "next";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import type { CourseListResponse } from "@/types";

export const metadata: Metadata = { title: "All Courses" };

interface Props {
  searchParams: Promise<{ q?: string; category?: string; level?: string; page?: string }>;
}

async function getCourses(params: { q?: string; category?: string; level?: string; page?: string }) {
  const searchParams = new URLSearchParams({ status: "published", per_page: "24" });
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
  const { items, total } = await getCourses(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          {params.q ? `Results for "${params.q}"` : "All Courses"}
        </h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {total.toLocaleString()} courses available
        </p>
      </div>

      <div className="flex gap-8">
        {/* Filters sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <h2 className="mb-3 text-sm font-semibold text-[--color-text-primary]">Level</h2>
            <div className="space-y-1">
              {LEVELS.map((level) => (
                <a
                  key={level.value}
                  href={`/courses?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(level.value ? { level: level.value } : {}) })}`}
                  className={`block rounded-[--radius-sm] px-3 py-2 text-sm transition-colors ${
                    (params.level ?? "") === level.value
                      ? "bg-[--color-primary]/10 font-medium text-[--color-primary]"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] py-20 text-center">
              <p className="text-base font-semibold text-[--color-text-secondary]">No courses found</p>
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
