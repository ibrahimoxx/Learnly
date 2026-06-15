"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { StudentRow } from "@/types";

export default function PerformanceStudentsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const result = await apiFetch<StudentRow[]>("/api/v1/instructor/performance/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(result);
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (students.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <h2 className="font-semibold text-[--color-text-primary]">No students yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Once students enroll in your courses, they will show up here.
        </p>
        <Link
          href="/instructor/courses"
          className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to My Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="premium-card overflow-hidden rounded-[--radius-lg]">
      <table className="w-full text-sm">
        <thead className="bg-[--color-surface-raised] text-left text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
          <tr>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Course</th>
            <th className="px-5 py-3">Enrolled</th>
            <th className="px-5 py-3 text-center">Progress</th>
            <th className="px-5 py-3">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[--color-border]">
          {students.map((s) => (
            <tr key={`${s.student_id}-${s.course_id}`}>
              <td className="px-5 py-3">
                <p className="font-medium text-[--color-text-primary]">{s.name}</p>
                <p className="text-xs text-[--color-text-muted]">{s.email}</p>
              </td>
              <td className="px-5 py-3 text-[--color-text-secondary]">{s.course_title}</td>
              <td className="px-5 py-3 text-[--color-text-secondary]">{new Date(s.enrolled_at).toLocaleDateString()}</td>
              <td className="px-5 py-3 text-center">
                <div className="mx-auto h-2 w-24 overflow-hidden rounded-full bg-[--color-border]">
                  <div
                    className="h-full rounded-full bg-[--color-primary]"
                    style={{ width: `${Math.min(100, s.progress_percent)}%` }}
                  />
                </div>
                <span className="mt-1 block text-xs text-[--color-text-muted]">{s.progress_percent.toFixed(0)}%</span>
              </td>
              <td className="px-5 py-3 text-[--color-text-secondary]">
                {s.last_activity_at ? new Date(s.last_activity_at).toLocaleDateString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
