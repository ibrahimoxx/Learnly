"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { DollarSign, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface ConnectStatus {
  connected: boolean;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

function SearchParamsHandler() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("success") === "1") toast.success("Stripe account connected!");
    if (searchParams.get("refresh") === "1") toast.info("Onboarding incomplete — try again.");
  }, [searchParams]);
  return null;
}

function PayoutsContent() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<ConnectStatus>("/api/v1/payouts/connect/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStatus(data);
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function startOnboarding() {
    setOnboarding(true);
    const token = await getToken();
    try {
      const { onboarding_url } = await apiFetch<{ onboarding_url: string }>(
        "/api/v1/payouts/connect/onboard",
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = onboarding_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start onboarding";
      toast.error(msg.includes("503") ? "Stripe Connect not configured yet" : msg);
      setOnboarding(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-5 w-5 text-[--color-primary]" />
        <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Payouts</h1>
      </div>

      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary] mb-1">Stripe Connect</h2>
        <p className="text-sm text-[--color-text-muted] mb-5">
          Connect your Stripe account to receive payouts from course sales.
        </p>

        {loading ? (
          <div className="h-10 w-40 animate-pulse rounded bg-[--color-surface]" />
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.charges_enabled && status.payouts_enabled ? (
                <CheckCircle className="h-5 w-5 text-[--color-success]" />
              ) : (
                <AlertCircle className="h-5 w-5 text-[--color-warning]" />
              )}
              <span className="text-sm font-medium text-[--color-text-primary]">
                {status.charges_enabled && status.payouts_enabled
                  ? "Account fully active"
                  : "Account connected — setup incomplete"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[--color-text-muted]">
              <span>Charges: {status.charges_enabled ? "✓ Enabled" : "✗ Disabled"}</span>
              <span>Payouts: {status.payouts_enabled ? "✓ Enabled" : "✗ Disabled"}</span>
            </div>
            {(!status.charges_enabled || !status.payouts_enabled) && (
              <Button variant="outline" onClick={startOnboarding} disabled={onboarding}>
                <ExternalLink className="h-4 w-4" />
                {onboarding ? "Redirecting…" : "Complete setup"}
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={startOnboarding} disabled={onboarding}>
            <ExternalLink className="h-4 w-4" />
            {onboarding ? "Redirecting to Stripe…" : "Connect Stripe account"}
          </Button>
        )}
      </div>

      <div className="mt-4 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] p-4">
        <p className="text-xs text-[--color-text-muted]">
          Revenue splits and payout history will appear here once your account is connected and courses have sales.
        </p>
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
      <PayoutsContent />
    </>
  );
}
