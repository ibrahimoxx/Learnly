"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, PlayCircle, FileText, ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Enrollment, Lesson, Section } from "@/types";

interface SectionWithLessons extends Section {
  lessons: Lesson[];
}

interface Props {
  enrollment: Enrollment;
  sectionsWithLessons: SectionWithLessons[];
  currentLesson: Lesson;
  token: string;
}

export function PlayerClient({ enrollment, sectionsWithLessons, currentLesson, token }: Props) {
  const router = useRouter();
  const progressRef = useRef<number>(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allLessons = sectionsWithLessons.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = allLessons[currentIndex + 1] ?? null;

  const saveProgress = useCallback(
    async (watched: number, position: number, completed: boolean) => {
      try {
        await apiFetch(`/api/v1/enrollments/${enrollment.id}/progress`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            lesson_id: currentLesson.id,
            watched_seconds: watched,
            last_position_seconds: position,
            is_completed: completed,
          }),
        });
      } catch {
        // silent — non-blocking
      }
    },
    [enrollment.id, currentLesson.id, token]
  );

  // Save progress every 10 seconds
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      if (progressRef.current > 0) {
        saveProgress(progressRef.current, progressRef.current, false);
      }
    }, 10_000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [saveProgress]);

  // Mark complete at 90% watched (via video events — placeholder for Vidstack integration)
  function handleTimeUpdate(currentTime: number, duration: number) {
    progressRef.current = currentTime;
    if (duration > 0 && currentTime / duration >= 0.9) {
      saveProgress(Math.floor(currentTime), Math.floor(currentTime), true);
    }
  }

  function navigateTo(lessonId: string) {
    router.push(`/learn/${enrollment.course_id}/${lessonId}`);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[oklch(10%_0.02_295)]">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[oklch(12%_0.03_295)] px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          My Learning
        </Link>
        <span className="text-white/30">/</span>
        <span className="truncate text-xs text-white/70">{currentLesson.title}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video / content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {currentLesson.lesson_type === "video" ? (
            <div className="relative flex-1 bg-black">
              {currentLesson.video_url ? (
                <video
                  key={currentLesson.id}
                  src={currentLesson.video_url}
                  controls
                  className="h-full w-full"
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    handleTimeUpdate(v.currentTime, v.duration);
                  }}
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
          ) : (
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="text-xl font-bold text-white">{currentLesson.title}</h2>
              {currentLesson.article_body ? (
                <div className="mt-4 prose prose-invert max-w-none text-white/80">
                  {currentLesson.article_body}
                </div>
              ) : (
                <p className="mt-4 text-white/50">Content coming soon.</p>
              )}
            </div>
          )}

          {/* Bottom: next lesson */}
          {nextLesson && (
            <div className="shrink-0 flex items-center justify-between border-t border-white/10 bg-[oklch(12%_0.03_295)] px-6 py-3">
              <span className="text-xs text-white/50">Up next: {nextLesson.title}</span>
              <button
                onClick={() => navigateTo(nextLesson.id)}
                className="rounded-sm bg-[--color-primary] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
              >
                Next lesson →
              </button>
            </div>
          )}
        </div>

        {/* Curriculum sidebar */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-[oklch(12%_0.03_295)] lg:block">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Course content
            </h2>
          </div>

          {sectionsWithLessons.map((section) => (
            <div key={section.id}>
              <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <p className="text-xs font-semibold text-white/80">{section.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{section.lessons.length} lessons</p>
              </div>

              <ul>
                {section.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLesson.id;
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => navigateTo(lesson.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left text-xs transition-colors hover:bg-white/5 ${
                          isCurrent ? "bg-[--color-primary]/20" : ""
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {isCurrent ? (
                            <PlayCircle className="h-4 w-4 text-[--color-primary]" />
                          ) : lesson.lesson_type === "video" ? (
                            <Circle className="h-4 w-4 text-white/30" />
                          ) : (
                            <FileText className="h-4 w-4 text-white/30" />
                          )}
                        </span>
                        <span className={`leading-snug ${isCurrent ? "text-white font-medium" : "text-white/60"}`}>
                          {lesson.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
