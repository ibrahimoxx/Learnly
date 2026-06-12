import Link from "next/link";
import { PlayCircle, Lock } from "lucide-react";
import type { Lesson, Course } from "@/types";

interface Props {
  lesson: Lesson;
  course: Course;
}

export function PreviewPlayer({ lesson, course }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-hero)]">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--color-hero-raised)] px-4 shadow-[var(--shadow-lg)]">
        <Link
          href={`/courses/${course.slug}`}
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
        >
          ← Back to course
        </Link>
        <span className="text-white/30">/</span>
        <span className="truncate text-xs text-white/70">{lesson.title}</span>
        <span className="ml-1 rounded-full bg-[var(--color-primary)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
          Free Preview
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        {lesson.type === "video" ? (
          <div className="relative flex-1 bg-black">
            {lesson.video_url ? (
              <video
                src={lesson.video_url}
                controls
                autoPlay
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white/40">
                  <PlayCircle className="mx-auto h-16 w-16 mb-3" />
                  <p className="text-sm">Video not yet available</p>
                </div>
              </div>
            )}
          </div>
        ) : lesson.type === "article" ? (
          <div className="flex-1 overflow-y-auto p-8">
            <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
            {lesson.content ? (
              <div className="mt-4 prose prose-invert max-w-none text-white/80">
                {lesson.content}
              </div>
            ) : (
              <p className="mt-4 text-white/50">Content coming soon.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-white/40">
              <Lock className="mx-auto h-12 w-12 mb-3" />
              <p className="text-sm">Enroll to take this quiz.</p>
            </div>
          </div>
        )}

        {/* CTA banner */}
        <div className="shrink-0 border-t border-white/10 bg-[var(--color-hero-raised)] px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <p className="text-sm text-white/70">
              Enjoying this preview? Enroll to access all{" "}
              <span className="font-semibold text-white">{course.total_lessons} lessons</span>.
            </p>
            <Link
              href={`/courses/${course.slug}`}
              className="shrink-0 rounded-md bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Enroll now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
