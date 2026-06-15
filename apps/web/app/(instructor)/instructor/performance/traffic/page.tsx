"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { TrafficRow } from "@/types";

export default function PerformanceTrafficPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TrafficRow[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const result = await apiFetch<TrafficRow[]>("/api/v1/instructor/performance/traffic", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(result);
    } catch {
      toast.error("Failed to load traffic data.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] p-4 text-sm text-[--color-text-secondary]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[--color-text-muted]" />
        <p>
          Page-view and traffic-source analytics arrive with PostHog in Phase 5. For now, this page shows
          wishlist interest versus enrollments as a proxy for conversion.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] p-10 text-center">
          <h2 className="font-semibold text-[--color-text-primary]">No data yet</h2>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Publish a course to start tracking wishlist interest and conversion.
          </p>
          <Link
            href="/instructor/courses"
            className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Go to My Courses
          </Link>
        </div>
      ) : (
        <div className="premium-card overflow-hidden rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="bg-[--color-surface-raised] text-left text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
              <tr>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3 text-center">Wishlisted</th>
                <th className="px-5 py-3 text-center">Enrolled</th>
                <th className="px-5 py-3 text-center">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {rows.map((row) => (
                <tr key={row.course_id}>
                  <td className="px-5 py-3 font-medium text-[--color-text-primary]">{row.title}</td>
                  <td className="px-5 py-3 text-center text-[--color-text-secondary]">{row.wishlist_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center text-[--color-text-secondary]">{row.enrollment_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center text-[--color-text-secondary]">{row.conversion_rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
