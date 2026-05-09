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
  try {
    const sections = await apiFetch<Section[]>(`/api/v1/courses/${courseId}/sections`);
    for (const section of sections) {
      const lessons = await apiFetch<Lesson[]>(`/api/v1/sections/${section.id}/lessons`);
      if (lessons.length > 0) {
        redirect(`/learn/${courseId}/${lessons[0].id}`);
      }
    }
  } catch {
    // fall through to notFound
  }

  notFound();
}
