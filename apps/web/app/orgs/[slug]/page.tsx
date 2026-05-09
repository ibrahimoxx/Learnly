import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import type { CourseListResponse } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

interface OrgStats {
  total_courses: number;
  total_members: number;
}

async function getOrgCourses(slug: string) {
  try {
    const data = await apiFetch<CourseListResponse>(`/api/v1/orgs/${slug}/courses?limit=8`);
    return data.items;
  } catch {
    return [];
  }
}

async function getOrgStats(slug: string): Promise<OrgStats> {
  try {
    return await apiFetch<OrgStats>(`/api/v1/orgs/${slug}/stats`);
  } catch {
    return { total_courses: 0, total_members: 0 };
  }
}

export default async function OrgHomePage({ params }: Props) {
  const { slug } = await params;
  const [courses, stats] = await Promise.all([getOrgCourses(slug), getOrgStats(slug)]);

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-[--color-border] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-[--color-text-primary] sm:text-4xl">
            Welcome to your learning hub
          </h1>
          <p className="mt-3 max-w-xl text-[--color-text-secondary]">
            Access all courses curated for your organization. Learn at your own pace.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href={`/orgs/${slug}/courses`}>
              <Button>Browse courses</Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
              <BookOpen className="h-4 w-4 text-[--color-primary]" />
              <span><strong className="text-[--color-text-primary]">{stats.total_courses}</strong> courses available</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
              <Users className="h-4 w-4 text-[--color-primary]" />
              <span>Team learning</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[--color-text-primary]">Available courses</h2>
          {courses.length > 0 && (
            <Link
              href={`/orgs/${slug}/courses`}
              className="flex items-center gap-1 text-sm font-medium text-[--color-primary] hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {courses.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] bg-white py-16 text-center">
            <BookOpen className="h-10 w-10 text-[--color-border]" />
            <p className="mt-3 text-sm text-[--color-text-muted]">No courses published yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
