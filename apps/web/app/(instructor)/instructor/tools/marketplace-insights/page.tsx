"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { MarketplaceInsightRow } from "@/types";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export default function InstructorMarketplaceInsightsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MarketplaceInsightRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<MarketplaceInsightRow[]>("/api/v1/instructor/tools/marketplace-insights", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error("Failed to load marketplace insights.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (rows.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-[--color-text-muted]" />
        <h2 className="mt-2 font-semibold text-[--color-text-primary]">No marketplace data yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Insights appear once published courses exist on the platform.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[--color-text-muted]">
        Aggregated data across all published Skillforge categories — use this to spot demand and pricing trends for your next course.
      </p>
      <div className="premium-card overflow-x-auto rounded-[--radius-lg]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[--color-border] text-xs uppercase tracking-wide text-[--color-text-muted]">
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Published courses</th>
              <th className="px-4 py-3">Avg. rating</th>
              <th className="px-4 py-3">Avg. price</th>
              <th className="px-4 py-3">Total enrollments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category_id} className="border-b border-[--color-border] last:border-0">
                <td className="px-4 py-3 font-medium text-[--color-text-primary]">{row.category_name}</td>
                <td className="px-4 py-3 text-[--color-text-secondary]">{row.course_count}</td>
                <td className="px-4 py-3 text-[--color-text-secondary]">
                  {row.average_rating > 0 ? `${row.average_rating.toFixed(1)} ★` : "—"}
                </td>
                <td className="px-4 py-3 text-[--color-text-secondary]">
                  {formatPrice(row.average_price_cents, row.currency)}
                </td>
                <td className="px-4 py-3 text-[--color-text-secondary]">{row.total_enrollments.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
