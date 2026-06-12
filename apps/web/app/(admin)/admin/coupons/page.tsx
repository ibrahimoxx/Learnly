"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
}

export default function AdminCouponsPage() {
  const { getToken } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Coupon[]>("/api/v1/coupons", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCoupons(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">All Coupons</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-[--radius-md]" />)}
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-[--color-text-muted] text-center py-10">No coupons created yet.</p>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Code", "Discount", "Uses", "Expires", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {coupons.map((c) => (
                <tr key={c.id} className={`transition-colors hover:bg-[--color-primary-subtle]/40 ${!c.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-[--color-text-primary]">{c.code}</td>
                  <td className="px-4 py-3 text-[--color-text-secondary]">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `$${(c.discount_value / 100).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{c.uses_count}/{c.max_uses ?? "∞"}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-extrabold ${c.is_active ? "text-[--color-success]" : "text-[--color-error]"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
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
