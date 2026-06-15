"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { EngagementRow } from "@/types";

export default function PerformanceEngagementPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EngagementRow[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const result = await apiFetch<EngagementRow[]>("/api/v1/instructor/performance/engagement", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(result);
    } catch {
      toast.error("Failed to load engagement data.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (rows.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <h2 className="font-semibold text-[--color-text-primary]">No engagement data yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Once students start watching your courses, completion and watch-time stats will appear here.
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
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.course_id} className="premium-card rounded-[--radius-lg] p-5">
          <h2 className="font-semibold text-[--color-text-primary]">{row.title}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">Students</p>
              <p className="mt-1 text-lg font-bold text-[--color-text-primary]">{row.total_students.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">Completed</p>
              <p className="mt-1 text-lg font-bold text-[--color-text-primary]">{row.completed_students.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">Completion rate</p>
              <p className="mt-1 text-lg font-bold text-[--color-text-primary]">{row.completion_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">Watch time</p>
              <p className="mt-1 text-lg font-bold text-[--color-text-primary]">{row.total_watch_minutes.toLocaleString()} min</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
              Average progress across enrolled students
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[--color-border]">
              <div
                className="h-full rounded-full bg-[--color-primary]"
                style={{ width: `${Math.min(100, row.average_progress_percent)}%` }}
              />
            </div>
            <span className="mt-1 block text-xs text-[--color-text-muted]">{row.average_progress_percent.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
