import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Enrollment, Section, Lesson } from "@/types";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function LearnCoursePage({ params }: Props) {
  const { courseId } = await params;
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = (await getToken()) ?? "";

  // Verify enrollment
  try {
    const enrollments = await apiFetch<Enrollment[]>("/api/v1/enrollments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const enrolled = enrollments.some((e) => e.course_id === courseId);
    if (!enrolled) redirect("/courses");
  } catch {
    redirect("/courses");
  }

  // Find first lesson
  let firstLessonId: string | null = null;
  try {
    const sections = await apiFetch<Section[]>(`/api/v1/courses/${courseId}/sections`);
    for (const section of sections) {
      const lessons = await apiFetch<Lesson[]>(`/api/v1/sections/${section.id}/lessons`);
      if (lessons.length > 0) {
        firstLessonId = lessons[0]!.id;
        break;
      }
    }
  } catch {
    // API error — fall through to no-content page
  }

  if (firstLessonId) redirect(`/learn/${courseId}/${firstLessonId}`);

  // Enrolled but course has no lessons yet
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[oklch(10%_0.02_295)] text-white">
      <p className="text-lg font-semibold">No lessons available yet</p>
      <p className="text-sm text-white/50">The instructor hasn&apos;t added content to this course yet.</p>
      <a href="/dashboard" className="mt-2 rounded bg-[--color-primary] px-5 py-2 text-sm font-semibold hover:bg-[--color-primary-hover] transition-colors">
        Back to dashboard
      </a>
    </div>
  );
}
