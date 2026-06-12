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
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="mesh-panel mx-auto mb-8 max-w-7xl rounded-[--radius-xl] p-6 text-white shadow-[var(--shadow-xl)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[--radius-md] bg-white/12 shadow-[var(--shadow-brand)] backdrop-blur">
            <GraduationCap className="h-7 w-7 text-[--color-primary]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">{path.title}</h1>
            {path.description && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/74">{path.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/68">
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
      <h2 className="mx-auto mb-4 max-w-7xl text-2xl font-black tracking-tight text-[--color-text-primary]">
        Courses in this path
      </h2>

      {path.courses.length === 0 ? (
        <div className="premium-card mx-auto max-w-7xl rounded-[--radius-lg] py-16 text-center">
          <img src="/brand/empty-state.svg" alt="" className="mx-auto mb-4 h-32 w-auto" />
          <p className="relative text-sm text-[--color-text-muted]">No courses added yet.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-3">
          {path.courses.map((course, idx) => (
            <div key={course.id} className="flex items-start gap-3">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[--color-primary-subtle] text-xs font-extrabold text-[--brand-800] shadow-[var(--shadow-xs)]">
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
