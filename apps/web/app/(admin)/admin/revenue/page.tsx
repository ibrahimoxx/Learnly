"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { DollarSign, Receipt, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface MonthlyRevenuePoint {
  month: string;
  revenue_cents: number;
}

interface TopCourseRevenue {
  course_id: string;
  title: string;
  instructor_name: string;
  revenue_cents: number;
  enrollment_count: number;
}

interface TopInstructorRevenue {
  instructor_id: string;
  name: string;
  email: string;
  revenue_cents: number;
  course_count: number;
}

interface AdminRevenueReport {
  total_revenue_cents: number;
  currency: string;
  transaction_count: number;
  monthly_revenue: MonthlyRevenuePoint[];
  top_courses: TopCourseRevenue[];
  top_instructors: TopInstructorRevenue[];
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export default function AdminRevenuePage() {
  const { getToken } = useAuth();
  const [data, setData] = useState<AdminRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const result = await apiFetch<AdminRevenueReport>("/api/v1/admin/revenue", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(result);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  if (loading || !data) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-64 rounded-[--radius-md]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[--radius-lg]" />)}
        </div>
        <Skeleton className="h-48 rounded-[--radius-lg]" />
      </div>
    );
  }

  const maxRevenue = Math.max(1, ...data.monthly_revenue.map((m) => m.revenue_cents));

  const stats = [
    { icon: DollarSign, label: "Total revenue", value: money(data.total_revenue_cents, data.currency) },
    { icon: Receipt, label: "Transactions", value: data.transaction_count.toLocaleString() },
    { icon: TrendingUp, label: "Top courses tracked", value: data.top_courses.length.toLocaleString() },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Revenue</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="premium-card overflow-hidden rounded-[--radius-lg]">
          <div className="border-b border-[--color-border] px-5 py-3">
            <h2 className="text-sm font-extrabold text-[--color-text-primary]">Top courses</h2>
          </div>
          {data.top_courses.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[--color-text-muted]">No course revenue yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[--color-border]">
                {data.top_courses.map((c) => (
                  <tr key={c.course_id} className="hover:bg-[--color-primary-subtle]/40">
                    <td className="px-5 py-3">
                      <p className="font-bold text-[--color-text-primary]">{c.title}</p>
                      <p className="text-xs text-[--color-text-muted]">{c.instructor_name} · {c.enrollment_count} enrollments</p>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[--color-text-primary]">{money(c.revenue_cents, data.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="premium-card overflow-hidden rounded-[--radius-lg]">
          <div className="border-b border-[--color-border] px-5 py-3">
            <h2 className="text-sm font-extrabold text-[--color-text-primary]">Top instructors</h2>
          </div>
          {data.top_instructors.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[--color-text-muted]">No instructor revenue yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[--color-border]">
                {data.top_instructors.map((i) => (
                  <tr key={i.instructor_id} className="hover:bg-[--color-primary-subtle]/40">
                    <td className="px-5 py-3">
                      <p className="font-bold text-[--color-text-primary]">{i.name}</p>
                      <p className="text-xs text-[--color-text-muted]">{i.email} · {i.course_count} courses</p>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[--color-text-primary]">{money(i.revenue_cents, data.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
