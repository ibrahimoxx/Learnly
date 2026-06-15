"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { RevenueReport } from "@/types";

const PERIODS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "all", label: "All time" },
] as const;

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function InstructorRevenueReportPage() {
  const { getToken } = useAuth();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30d");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RevenueReport | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await apiFetch<RevenueReport>(`/api/v1/instructor/finances/revenue-report?period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(data);
    } catch {
      toast.error("Failed to load revenue report.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(period); }, [period, load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-5 w-5 text-[--color-primary]" />
        <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Revenue Report</h1>
      </div>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        Purchases and refunds across all your courses.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "rounded-[--radius-sm] px-3 py-1.5 text-sm font-medium transition-colors",
              period === p.value
                ? "bg-[--color-primary] text-white"
                : "border border-[--color-border] text-[--color-text-secondary] hover:bg-[--color-surface-raised]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 h-6 w-48 animate-pulse rounded bg-[--color-border]" />
      ) : !report || report.transactions.length === 0 ? (
        <div className="premium-card mt-6 rounded-[--radius-lg] p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-[--color-text-muted]" />
          <h2 className="mt-2 font-semibold text-[--color-text-primary]">No transactions in this period</h2>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Sales and refunds will show up here as students enroll in your courses.
          </p>
          <Link
            href="/instructor/courses"
            className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Go to My Courses
          </Link>
        </div>
      ) : (
        <>
          <div className="premium-card mt-6 rounded-[--radius-lg] p-6">
            <p className="text-sm text-[--color-text-muted]">Total revenue</p>
            <p className="mt-1 text-3xl font-black text-[--color-text-primary]">
              {formatMoney(report.total_revenue_cents, report.currency)}
            </p>
            <p className="mt-1 text-xs text-[--color-text-muted]">{report.transaction_count} transaction{report.transaction_count === 1 ? "" : "s"}</p>
          </div>

          <div className="premium-card mt-4 overflow-x-auto rounded-[--radius-lg]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[--color-border] text-xs uppercase tracking-wide text-[--color-text-muted]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.transactions.map((t) => (
                  <tr key={`${t.enrollment_id}-${t.type}`} className="border-b border-[--color-border] last:border-0">
                    <td className="px-4 py-3 text-[--color-text-secondary]">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-[--color-text-primary]">{t.course_title}</td>
                    <td className="px-4 py-3 text-[--color-text-secondary]">{t.student_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          t.type === "refund"
                            ? "bg-[--color-error]/10 text-[--color-error]"
                            : "bg-[--color-success]/10 text-[--color-success]"
                        )}
                      >
                        {t.type === "refund" ? "Refund" : "Purchase"}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-medium",
                        t.amount_cents < 0 ? "text-[--color-error]" : "text-[--color-text-primary]"
                      )}
                    >
                      {formatMoney(t.amount_cents, t.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
