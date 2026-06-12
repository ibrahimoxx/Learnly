"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Copy, CheckCheck, TrendingUp, DollarSign, Users, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { AffiliateStats, AffiliateConversion } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AffiliatePageInstructor() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const [s, c] = await Promise.all([
          apiFetch<AffiliateStats>("/api/v1/affiliate/my-link", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<AffiliateConversion[]>("/api/v1/affiliate/my-conversions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setStats(s);
        setConversions(c);
      } catch {
        toast.error("Failed to load affiliate data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function toggleActive() {
    if (!stats) return;
    setToggling(true);
    try {
      const token = await getToken();
      const updated = await apiFetch<AffiliateStats>("/api/v1/affiliate/my-link", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !stats.link.is_active }),
      });
      setStats(updated);
      toast.success(updated.link.is_active ? "Link activated" : "Link deactivated");
    } catch {
      toast.error("Failed to update link");
    } finally {
      setToggling(false);
    }
  }

  function getShareUrl() {
    return `${APP_URL}/courses?ref=${stats?.link.code ?? ""}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full rounded-[--radius-md]" />
        <Skeleton className="h-48 w-full rounded-[--radius-md]" />
      </div>
    );
  }

  if (!stats) return null;

  const { link } = stats;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Affiliate Program</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Share your referral link and earn {link.commission_pct}% commission on paid enrollments.
        </p>
      </div>

      {/* Link card */}
      <div className="premium-card rounded-[--radius-lg] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[--color-primary]" />
            <span className="text-sm font-semibold text-[--color-text-primary]">Your referral link</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={link.is_active ? "success" : "secondary"}>
              {link.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button size="sm" variant="outline" onClick={toggleActive} disabled={toggling}>
              {link.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] px-3 py-2">
          <code className="flex-1 truncate text-xs text-[--color-text-secondary]">{getShareUrl()}</code>
          <button
            onClick={copyLink}
            className="shrink-0 text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
            title="Copy link"
          >
            {copied ? <CheckCheck className="h-4 w-4 text-[--color-success]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-[--color-border]">
          <span className="text-xs text-[--color-text-muted]">Commission rate:</span>
          <span className="text-sm font-bold text-[--color-text-primary]">{link.commission_pct}%</span>
          <span className="text-xs text-[--color-text-muted]">(set by platform admin)</span>
        </div>

        <p className="text-xs text-[--color-text-muted]">
          Code: <span className="font-mono font-bold text-[--color-text-primary]">{link.code}</span>
          {" · "}
          {link.click_count.toLocaleString()} click{link.click_count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: "Conversions", value: stats.total_conversions.toString() },
          { icon: TrendingUp, label: "Total Revenue", value: formatCents(stats.total_revenue_cents) },
          { icon: DollarSign, label: "Total Earned", value: formatCents(stats.total_commission_cents) },
          { icon: DollarSign, label: "Pending Payout", value: formatCents(stats.pending_commission_cents) },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="hover-lift premium-card rounded-[--radius-md] p-4 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5 text-xs text-[--color-text-muted]">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="text-lg font-bold text-[--color-text-primary]">{value}</p>
          </div>
        ))}
      </div>

      {/* Conversions table */}
      <div className="premium-card rounded-[--radius-md]">
        <div className="px-5 py-4 border-b border-[--color-border]">
          <h2 className="text-sm font-semibold text-[--color-text-primary]">Conversion History</h2>
        </div>
        {conversions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[--color-text-muted]">
            No conversions yet. Share your link to start earning.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[--color-border] bg-[--color-surface] text-[--color-text-muted]">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                  <th className="px-5 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.id} className="border-b border-[--color-border] transition-colors last:border-0 hover:bg-[--color-primary-subtle]">
                    <td className="px-5 py-3 text-[--color-text-secondary]">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3 text-right text-[--color-text-primary] font-medium">
                      {c.amount_cents === 0 ? "Free" : formatCents(c.amount_cents)}
                    </td>
                    <td className="px-5 py-3 text-right text-[--color-success] font-medium">
                      {c.commission_cents === 0 ? "—" : formatCents(c.commission_cents)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={c.status === "paid" ? "success" : "secondary"} className="text-[10px]">
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
