"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

interface Props {
  courseId: string;
  isFree: boolean;
  priceInCents: number;
  isEnrolled: boolean;
}

interface CouponResult {
  valid: boolean;
  discount_type: string;
  discount_value: number;
  original_price_cents: number;
  discounted_price_cents: number;
  message: string;
}

function getAffiliateCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)affiliate_ref=([^;]+)/);
  return match ? match[1] : undefined;
}

export function EnrollButton({ courseId, isFree, priceInCents, isEnrolled }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl={pathname}>
        <Button
          className="mt-4 w-full text-sm font-semibold shadow-[var(--shadow-brand)] transition-shadow hover:shadow-[var(--shadow-lg)]"
          size="lg"
        >
          {isFree ? "Enroll for free" : "Buy now"}
        </Button>
      </SignInButton>
    );
  }

  if (isEnrolled) {
    return (
      <Link href={`/learn/${courseId}`} className="mt-4 block">
        <Button
          className="w-full text-sm font-semibold shadow-[var(--shadow-brand)] transition-shadow hover:shadow-[var(--shadow-lg)]"
          size="lg"
        >
          Go to course
        </Button>
      </Link>
    );
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await apiFetch<CouponResult>("/api/v1/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode.trim(), course_id: courseId }),
      });
      setCouponResult(result);
      if (!result.valid) toast.error(result.message);
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setCouponCode("");
    setCouponResult(null);
    setShowCoupon(false);
  }

  async function handleEnroll() {
    setLoading(true);
    try {
      const token = await getToken();
      const affiliateCode = getAffiliateCookie();

      if (!isFree) {
        const { checkout_url } = await apiFetch<{ checkout_url: string; session_id: string }>(
          "/api/v1/checkout/sessions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              course_id: courseId,
              coupon_code: couponResult?.valid ? couponCode.trim() : undefined,
              affiliate_code: affiliateCode,
            }),
          }
        );
        window.location.href = checkout_url;
        return;
      }

      const enrollment = await apiFetch<Enrollment>("/api/v1/enrollments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_id: courseId, affiliate_code: affiliateCode }),
      });
      void enrollment;
      posthog?.capture("course_enrolled", { course_id: courseId, is_free: true });
      toast.success("Enrolled successfully!");
      router.push(`/learn/${courseId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      if (msg.includes("409")) {
        router.push("/dashboard");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const finalPrice = couponResult?.valid
    ? couponResult.discounted_price_cents
    : priceInCents;

  return (
    <div className="mt-4 space-y-2">
      <Button
        className="w-full text-sm font-semibold shadow-[var(--shadow-brand)] transition-shadow hover:shadow-[var(--shadow-lg)]"
        size="lg"
        onClick={handleEnroll}
        disabled={loading}
      >
        {loading
          ? "Processing\u2026"
          : isFree
            ? "Enroll for free"
            : `Buy now \u2014 $${(finalPrice / 100).toFixed(2)}`}
      </Button>

      {!isFree && (
        <>
          {!showCoupon ? (
            <button
              onClick={() => setShowCoupon(true)}
              className="flex w-full justify-center gap-1.5 text-xs text-[--color-text-muted] transition-colors hover:text-[--color-primary]"
            >
              <Tag className="h-3 w-3" /> Have a coupon?
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponResult(null);
                  }}
                  placeholder="Enter coupon code"
                  className="h-8 text-xs uppercase"
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded border border-[--color-border] px-3 text-xs font-semibold text-[--color-text-secondary] transition-colors hover:bg-[--color-surface] disabled:opacity-50"
                >
                  {couponLoading ? "\u2026" : "Apply"}
                </button>
                <button
                  onClick={clearCoupon}
                  className="text-[--color-text-muted] hover:text-[--color-text-primary]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {couponResult?.valid && (
                <p className="text-xs font-medium text-[--color-success]">
                  {"\u2713"} {couponResult.message} \u2014 $
                  {(couponResult.discounted_price_cents / 100).toFixed(2)} (was $
                  {(priceInCents / 100).toFixed(2)})
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
