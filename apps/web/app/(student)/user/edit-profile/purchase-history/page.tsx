"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Gift, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSubnav } from "@/components/shared/account-subnav";
import { apiFetch } from "@/lib/api";
import type { PurchaseHistoryItem } from "@/types";

function formatAmount(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function HistorySkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="premium-card flex items-center justify-between rounded-[--radius-md] p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your purchase history</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <Receipt className="h-12 w-12 text-[--color-text-muted]" />
      <p className="font-extrabold text-[--color-text-secondary]">No purchases yet</p>
      <p className="max-w-md text-sm text-[--color-text-secondary]">
        Courses you buy or receive as gifts will show up here with the date and amount paid.
      </p>
      <Link href="/courses" className="mt-2">
        <Button>Browse courses</Button>
      </Link>
    </div>
  );
}

export default function PurchaseHistoryPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<PurchaseHistoryItem[]>("/api/v1/users/me/purchase-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Purchase history</h1>
        <p className="mt-2 text-[--color-text-secondary]">All courses you&apos;ve bought or received, with the date and amount.</p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <HistorySkeleton />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="hover-lift premium-card flex items-center justify-between gap-4 rounded-[--radius-md] p-4">
                <div className="min-w-0">
                  <Link
                    href={`/courses/${item.course_slug}`}
                    className="line-clamp-2 font-semibold text-[--color-text-primary] transition-colors hover:text-[--color-primary]"
                  >
                    {item.course_title}
                  </Link>
                  <p className="mt-1 text-xs text-[--color-text-muted]">{formatDate(item.purchased_at)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-extrabold text-[--color-text-primary]">{formatAmount(item.amount_cents, item.currency)}</span>
                  {item.is_gift_purchase ? (
                    <Badge variant="secondary">
                      <Gift className="mr-1 h-3 w-3" />
                      Gift
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/courses">
                <Button variant="secondary">Browse more courses</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
