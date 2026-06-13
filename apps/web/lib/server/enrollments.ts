import "server-only";

import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";
import { getEnrollmentCourseIds } from "./enrollment-course-ids";
import { getOptionalAuth } from "./optional-auth";

export async function getViewerEnrollments(): Promise<Enrollment[]> {
  const authResult = await getOptionalAuth();
  if (!authResult?.userId) return [];

  const token = (await authResult.getToken()) ?? "";
  try {
    return await apiFetch<Enrollment[]>("/api/v1/enrollments", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return [];
  }
}

export async function getViewerEnrollmentCourseIds(): Promise<string[]> {
  return getEnrollmentCourseIds(await getViewerEnrollments());
}
