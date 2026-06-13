import type { Metadata } from "next";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import { getViewerEnrollmentCourseIds } from "@/lib/server/enrollments";
import type { CourseListResponse } from "@/types";
import { BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Courses — ${slug}` };
}

async function getOrgCourses(slug: string, q?: string, page = 1) {
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (q) qs.set("q", q);
  try {
    return await apiFetch<CourseListResponse>(`/api/v1/orgs/${slug}/courses?${qs}`);
  } catch {
    return { items: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  }
}

export default async function OrgCoursesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q, page } = await searchParams;
  const [data, ownedCourseIds] = await Promise.all([
    getOrgCourses(slug, q, Number(page ?? 1)),
    getViewerEnrollmentCourseIds(),
  ]);
  const ownedCourseIdSet = new Set(ownedCourseIds);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Courses</h1>
        <p className="text-sm text-[--color-text-muted]">{data.total} courses</p>
      </div>

      {/* Search */}
      <form className="mt-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search courses..."
          className="w-full max-w-sm rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm shadow-[var(--shadow-xs)] focus:outline-none focus:ring-2 focus:ring-[--color-primary]/40"
        />
      </form>

      {data.items.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((course) => (
            <CourseCard key={course.id} course={course} isOwned={ownedCourseIdSet.has(course.id)} />
          ))}
        </div>
      ) : (
        <div className="premium-card mt-16 flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
          <img src="/brand/empty-state.svg" alt="" className="mb-4 h-32 w-auto" />
          <BookOpen className="h-10 w-10 text-[--color-primary]" />
          <p className="relative mt-3 text-sm text-[--color-text-muted]">
            {q ? `No courses match "${q}"` : "No courses available yet."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`flex h-8 w-8 items-center justify-center rounded text-sm ${
                p === Number(page ?? 1)
                  ? "bg-[--color-primary] text-white"
                  : "border border-[--color-border] text-[--color-text-secondary] hover:bg-[--color-surface]"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
