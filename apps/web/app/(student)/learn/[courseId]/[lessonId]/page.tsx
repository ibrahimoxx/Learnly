import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PlayerClient } from "./player-client";
import { PreviewPlayer } from "./preview-player";
import { LockedLesson } from "./locked-lesson";
import type { Section, Lesson, Enrollment, Course } from "@/types";

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

async function getCourse(courseId: string) {
  try {
    return await apiFetch<Course>(`/api/v1/courses/${courseId}`);
  } catch {
    return null;
  }
}

async function getSections(courseId: string) {
  try {
    return await apiFetch<Section[]>(`/api/v1/courses/${courseId}/sections`);
  } catch {
    return [];
  }
}

async function getLessons(sectionId: string) {
  try {
    return await apiFetch<Lesson[]>(`/api/v1/sections/${sectionId}/lessons`);
  } catch {
    return [];
  }
}

async function findLesson(courseId: string, lessonId: string): Promise<Lesson | null> {
  const sections = await getSections(courseId);
  const allLessons = (
    await Promise.all(sections.map((s) => getLessons(s.id)))
  ).flat();
  return allLessons.find((l) => l.id === lessonId) ?? allLessons[0] ?? null;
}

export default async function PlayerPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const { userId, getToken } = await auth();

  if (!userId) {
    const [lesson, course] = await Promise.all([
      findLesson(courseId, lessonId),
      getCourse(courseId),
    ]);
    if (!lesson || !course) notFound();
    if (!lesson.is_free_preview) redirect("/sign-in");
    return <PreviewPlayer lesson={lesson} course={course} />;
  }

  const token = (await getToken()) ?? "";
  const enrollment = await getEnrollment(courseId, token);
  if (!enrollment) redirect(`/courses`);

  const sections = await getSections(courseId);
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      lessons: await getLessons(section.id),
    }))
  );

  const allLessons = sectionsWithLessons.flatMap((s) => s.lessons);
  const currentLesson =
    allLessons.find((l) => l.id === lessonId) ?? allLessons[0];

  if (!currentLesson) notFound();

  if (currentLesson.unlock_at && new Date() < new Date(currentLesson.unlock_at)) {
    return <LockedLesson lesson={currentLesson} />;
  }

  return (
    <PlayerClient
      enrollment={enrollment}
      sectionsWithLessons={sectionsWithLessons}
      currentLesson={currentLesson}
      token={token}
    />
  );
}
