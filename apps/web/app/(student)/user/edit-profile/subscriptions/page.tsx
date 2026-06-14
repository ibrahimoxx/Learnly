"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSubnav } from "@/components/shared/account-subnav";
import { apiFetch } from "@/lib/api";
import type { SubscriptionRead } from "@/types";

function SubscriptionSkeleton() {
  return (
    <div className="premium-card mt-6 rounded-[--radius-lg] p-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <Skeleton className="mt-2 h-4 w-2/3 max-w-sm" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your subscription</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<SubscriptionRead>("/api/v1/users/me/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(data);
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
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Subscription</h1>
        <p className="mt-2 text-[--color-text-secondary]">Your current Skillforge plan.</p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <SubscriptionSkeleton />
        ) : error || !subscription ? (
          <ErrorState onRetry={load} />
        ) : (
          <div className="premium-card mt-6 rounded-[--radius-lg] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] shadow-[var(--shadow-brand)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-[--color-text-primary]">{subscription.plan} plan</p>
                <Badge variant="success" className="mt-1 capitalize">
                  {subscription.status}
                </Badge>
              </div>
            </div>

            <p className="mt-4 text-[--color-text-secondary]">{subscription.description}</p>

            {subscription.renews_at ? (
              <p className="mt-2 text-sm text-[--color-text-muted]">
                Renews on {new Date(subscription.renews_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/pricing">
                <Button>View team plans</Button>
              </Link>
              <Link href="/courses">
                <Button variant="secondary">Browse courses</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
