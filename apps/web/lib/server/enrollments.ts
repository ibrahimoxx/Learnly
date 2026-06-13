import "server-only";

import { auth } from "@clerk/nextjs/server";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

export async function getViewerEnrollments(): Promise<Enrollment[]> {
  const { userId, getToken } = await auth();
  if (!userId) return [];

  const token = (await getToken()) ?? "";
  try {
    return await apiFetch<Enrollment[]>("/api/v1/enrollments", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return [];
  }
}
