"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type ConfirmState = "loading" | "confirmed" | "error";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const [state, setState] = useState<ConfirmState>("loading");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setState("error");
      return;
    }

    let cancelled = false;
    async function confirm() {
      try {
        const token = await getToken();
        await apiFetch(`/api/v1/checkout/sessions/${sessionId}/confirm`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setState("confirmed");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void confirm();
    return () => { cancelled = true; };
  }, [searchParams, getToken]);

  if (state === "loading") {
    return (
      <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
          <Loader2 className="h-12 w-12 animate-spin text-[--color-primary]" />
          <h1 className="mt-5 text-2xl font-black tracking-tight text-[--color-text-primary]">
            Confirming your enrollment…
          </h1>
          <p className="mt-2 text-[--color-text-muted]">This only takes a moment.</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[--color-error]/10">
            <XCircle className="h-12 w-12 text-[--color-error]" />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[--color-text-primary]">
            Couldn&apos;t confirm payment
          </h1>
          <p className="mt-2 text-[--color-text-muted]">
            If you were charged, your enrollment will still complete automatically. Check My Learning in a moment, or contact support if it doesn&apos;t appear.
          </p>
          <Link href="/dashboard" className="mt-6">
            <Button>Go to My Learning</Button>
          </Link>
        </div>
      </div>
    );
  }

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
