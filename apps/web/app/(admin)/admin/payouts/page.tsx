"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface AdminPayoutRow {
  instructor_id: string;
  name: string;
  email: string;
  stripe_connected: boolean;
  total_revenue_cents: number;
  currency: string;
  course_count: number;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

export default function AdminPayoutsPage() {
  const { getToken } = useAuth();
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<AdminPayoutRow[]>("/api/v1/admin/payouts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRows(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Instructor Payouts</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-[--radius-md]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-12 text-center">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">No instructor revenue recorded yet.</p>
        </div>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Instructor", "Email", "Courses", "Revenue", "Stripe"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {rows.map((row) => (
                <tr key={row.instructor_id} className="transition-colors hover:bg-[--color-primary-subtle]/40">
                  <td className="px-4 py-3 font-bold text-[--color-text-primary]">{row.name}</td>
                  <td className="px-4 py-3 text-[--color-text-secondary]">{row.email}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{row.course_count}</td>
                  <td className="px-4 py-3 font-bold text-[--color-text-primary]">{money(row.total_revenue_cents, row.currency)}</td>
                  <td className="px-4 py-3">
                    {row.stripe_connected ? (
                      <Badge variant="success">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[--color-text-muted]">Not connected</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
