import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraduationCap, BookOpen, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CourseCard } from "@/components/features/courses/course-card";
import type { LearningPathDetail } from "@/types";
import { PathFollowButton } from "./path-follow-button";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPath(slug: string): Promise<LearningPathDetail | null> {
  try {
    return await apiFetch<LearningPathDetail>(`/api/v1/learning-paths/${slug}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const path = await getPath(slug);
  return { title: path?.title ?? "Learning Path" };
}

export default async function PathDetailPage({ params }: Props) {
  const { slug } = await params;
  const path = await getPath(slug);
  if (!path) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-8 rounded-[--radius-lg] border border-[--color-border] bg-linear-to-br from-[--color-primary]/8 to-[--color-surface] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[--radius-md] bg-[--color-primary]/15">
            <GraduationCap className="h-7 w-7 text-[--color-primary]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[--color-text-primary] sm:text-2xl">{path.title}</h1>
            {path.description && (
              <p className="mt-2 text-sm text-[--color-text-secondary] leading-relaxed">{path.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[--color-text-muted]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {path.course_count} course{path.course_count !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {path.enrolled_count.toLocaleString()} follower{path.enrolled_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <PathFollowButton slug={path.slug} />
          </div>
        </div>
      </div>

      {/* Courses */}
      <h2 className="mb-4 text-lg font-semibold text-[--color-text-primary]">
        Courses in this path
      </h2>

      {path.courses.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-dashed border-[--color-border] py-16 text-center">
          <p className="text-sm text-[--color-text-muted]">No courses added yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {path.courses.map((course, idx) => (
            <div key={course.id} className="flex items-start gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[--color-primary]/10 text-xs font-bold text-[--color-primary]">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <CourseCard course={course} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
