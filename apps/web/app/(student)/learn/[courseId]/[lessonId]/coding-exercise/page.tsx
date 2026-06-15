import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CodingExercisePlayer } from "@/components/features/coding/coding-exercise-player";
import type { Enrollment, Lesson, Section } from "@/types";

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>;
}

async function getEnrollment(courseId: string, token: string) {
  try {
    const enrollments = await apiFetch<Enrollment[]>("/api/v1/enrollments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return enrollments.find((e) => e.course_id === courseId) ?? null;
  } catch {
    return null;
  }
}

async function findLesson(courseId: string, lessonId: string): Promise<Lesson | null> {
  try {
    const sections = await apiFetch<Section[]>(`/api/v1/courses/${courseId}/sections`);
    const allLessons = (
      await Promise.all(sections.map((s) => apiFetch<Lesson[]>(`/api/v1/sections/${s.id}/lessons`)))
    ).flat();
    return allLessons.find((l) => l.id === lessonId) ?? null;
  } catch {
    return null;
  }
}

export default async function CodingExercisePage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = (await getToken()) ?? "";
  const enrollment = await getEnrollment(courseId, token);
  if (!enrollment) redirect("/courses");

  const lesson = await findLesson(courseId, lessonId);
  if (!lesson || lesson.type !== "coding_exercise") notFound();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-hero)]">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[var(--color-hero-raised)] px-4 shadow-[var(--shadow-lg)]">
        <Link
          href={`/learn/${courseId}/${lessonId}`}
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to lesson
        </Link>
        <span className="text-white/30">/</span>
        <span className="truncate text-xs text-white/70">{lesson.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CodingExercisePlayer lessonId={lesson.id} token={token} />
      </div>
    </div>
  );
}
