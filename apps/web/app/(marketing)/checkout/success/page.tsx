"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const ranOnce = useRef(false);

  // Stripe only ever redirects here after a successful payment — so the
  // success message is always correct. This confirm call is a best-effort
  // fulfillment safety net (in case the webhook hasn't fired yet locally),
  // run silently in the background. It must never block or scare the user —
  // the webhook (or a retry) will always catch up eventually.
  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    (async () => {
      const token = await getToken();
      await apiFetch(`/api/v1/checkout/sessions/${sessionId}/confirm`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    })().catch(() => {
      // Silent — the Stripe webhook is the source of truth and will fulfill
      // this independently. No need to alarm a customer who already paid.
    });
  }, [searchParams, getToken]);

  return (
    <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
        <span className="relative flex h-24 w-24 animate-scale-in items-center justify-center rounded-full bg-[--color-primary-subtle] shadow-[var(--shadow-brand)]">
          <CheckCircle className="h-12 w-12 text-[--color-success]" />
        </span>
        <h1 className="relative mt-5 text-3xl font-black tracking-tight text-[--color-text-primary]">
          Payment successful!
        </h1>
        <p className="mt-2 text-[--color-text-muted]">
          You&apos;re now enrolled. Head to your dashboard to start learning.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button>Go to My Learning</Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
