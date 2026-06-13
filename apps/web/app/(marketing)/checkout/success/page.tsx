"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useCartStore } from "@/lib/stores/cart-store";
import type { CheckoutSessionStatus } from "@/types";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { getToken, isSignedIn } = useAuth();
  const removeItem = useCartStore((state) => state.removeItem);

  useEffect(() => {
    if (!sessionId || !isSignedIn) return;
    let cancelled = false;

    async function syncCart() {
      try {
        const token = await getToken();
        const result = await apiFetch<CheckoutSessionStatus>(
          `/api/v1/checkout/sessions/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled && result.course_id) {
          removeItem(result.course_id);
        }
      } catch {
        // Cart cleanup is best-effort — enrollment itself is already confirmed via webhook.
      }
    }

    void syncCart();
    return () => {
      cancelled = true;
    };
  }, [sessionId, isSignedIn, getToken, removeItem]);

  return (
    <div className="premium-shell flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="premium-card flex max-w-xl flex-col items-center rounded-[--radius-xl] px-8 py-12">
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[--color-primary-subtle] animate-scale-in shadow-[var(--shadow-brand)]">
          <CheckCircle className="h-12 w-12 text-[--color-success]" />
        </span>
        <h1 className="relative mt-5 text-3xl font-black tracking-tight text-[--color-text-primary]">Payment successful!</h1>
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
