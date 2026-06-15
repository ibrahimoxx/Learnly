"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { DollarSign, Users, BookOpen, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PerformanceOverview } from "@/types";

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export default function PerformanceOverviewPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceOverview | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const result = await apiFetch<PerformanceOverview>("/api/v1/instructor/performance/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(result);
    } catch {
      toast.error("Failed to load performance overview.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (!data || data.total_courses === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <h2 className="font-semibold text-[--color-text-primary]">No courses yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Create and publish a course to start tracking performance.
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

  const maxRevenue = Math.max(1, ...data.monthly_revenue.map((m) => m.revenue_cents));

  const stats = [
    { icon: DollarSign, label: "Total revenue", value: money(data.total_revenue_cents, data.currency) },
    { icon: Users, label: "Total students", value: data.total_students.toLocaleString() },
    { icon: BookOpen, label: "Courses", value: data.total_courses.toLocaleString() },
    { icon: Star, label: "Average rating", value: data.average_rating > 0 ? data.average_rating.toFixed(2) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="premium-card rounded-[--radius-lg] p-5">
            <div className="flex items-center gap-2 text-[--color-text-muted]">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-black text-[--color-text-primary]">{value}</p>
          </div>
        ))}
      </div>

      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Revenue — last 12 months</h2>
        {data.monthly_revenue.length === 0 ? (
          <p className="mt-2 text-sm text-[--color-text-muted]">No revenue recorded yet.</p>
        ) : (
          <div className="mt-6 flex items-end gap-2" style={{ height: "160px" }}>
            {data.monthly_revenue.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-[--radius-sm] bg-[--color-primary]"
                  style={{ height: `${Math.max(4, (m.revenue_cents / maxRevenue) * 130)}px` }}
                  title={money(m.revenue_cents, data.currency)}
                />
                <span className="text-[10px] font-medium text-[--color-text-muted]">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="premium-card overflow-hidden rounded-[--radius-lg]">
        <table className="w-full text-sm">
          <thead className="bg-[--color-surface-raised] text-left text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
            <tr>
              <th className="px-5 py-3">Course</th>
              <th className="px-5 py-3 text-center">Students</th>
              <th className="px-5 py-3 text-center">Revenue</th>
              <th className="px-5 py-3 text-center">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border]">
            {data.courses.map((course) => (
              <tr key={course.course_id}>
                <td className="px-5 py-3 font-medium text-[--color-text-primary]">{course.title}</td>
                <td className="px-5 py-3 text-center text-[--color-text-secondary]">{course.enrollment_count.toLocaleString()}</td>
                <td className="px-5 py-3 text-center text-[--color-text-secondary]">{money(course.revenue_cents, course.currency)}</td>
                <td className="px-5 py-3 text-center text-[--color-text-secondary]">
                  {course.review_count > 0 ? `${course.rating.toFixed(2)} (${course.review_count})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
