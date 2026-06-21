"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Trash2, Tag, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useCartStore } from "@/lib/stores/cart-store";
import { getCartCourseIdsToRemove } from "./cart-reconcile";

interface Props {
  enrolledCourseIds: string[];
}

interface CouponValidateResult {
  valid: boolean;
  discount_type: string;
  discount_value: number;
  original_price_cents: number;
  discounted_price_cents: number;
  message: string;
}

type CouponState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: CouponValidateResult }
  | { status: "error"; message: string };

function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

export function CartClient({ enrolledCourseIds }: Props) {
  const { items, removeItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [couponState, setCouponState] = useState<CouponState>({ status: "idle" });

  const selectedItems = items.filter((item) => selectedIds.has(item.courseId));
  const soloItem = selectedItems.length === 1 ? selectedItems[0] : undefined;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const courseIdsToRemove = getCartCourseIdsToRemove(items, enrolledCourseIds);
    courseIdsToRemove.forEach((courseId) => removeItem(courseId));
  }, [enrolledCourseIds, items, removeItem]);

  useEffect(() => {
    setSelectedIds(new Set(items.map((item) => item.courseId)));
  }, [items]);

  useEffect(() => {
    setCouponState({ status: "idle" });
  }, [soloItem?.courseId]);

  function toggleSelected(courseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }

  async function applyCoupon() {
    if (!soloItem) return;
    const code = couponCode.trim();
    if (!code) return;
    setCouponState({ status: "loading" });
    try {
      const result = await apiFetch<CouponValidateResult>("/api/v1/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code, course_id: soloItem.courseId }),
      });
      if (result.valid) {
        setCouponState({ status: "success", result });
      } else {
        setCouponState({ status: "error", message: result.message || "Coupon is not valid for this course" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not validate coupon";
      setCouponState({ status: "error", message });
    }
  }

  if (!mounted) {
    return <div className="premium-shell mx-auto max-w-5xl px-4 py-16 sm:px-6" />;
  }

  const subtotal = selectedItems.reduce((sum, item) => sum + item.priceInCents, 0);
  const appliedCoupon =
    soloItem && couponState.status === "success" && couponState.result.valid ? couponCode.trim() : null;
  const checkoutHref = soloItem
    ? `/payment/checkout?courseId=${soloItem.courseId}${appliedCoupon ? `&coupon=${encodeURIComponent(appliedCoupon)}` : ""}`
    : `/payment/checkout?courseIds=${selectedItems.map((item) => item.courseId).join(",")}`;
  const noneSelected = selectedItems.length === 0;

  if (items.length === 0) {
    return (
      <div className="premium-shell mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <div className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-[--color-primary-subtle] shadow-[var(--shadow-brand)]">
          <ShoppingCart className="h-9 w-9 text-[--color-primary]" />
        </div>
        <h1 className="animate-fade-up mt-6 font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
          Your cart is empty
        </h1>
        <p className="animate-fade-up mt-2 max-w-md text-[--color-text-secondary]">
          Looks like you haven&apos;t added any courses yet. Browse the catalog to find your next skill.
        </p>
        <Link href="/courses" className="mt-6">
          <Button size="lg">Browse courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="premium-shell mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="animate-fade-up font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
        Shopping Cart
      </h1>
      <p className="mt-1 text-sm text-[--color-text-secondary]">
        {items.length} {items.length === 1 ? "course" : "courses"} in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="stagger-children space-y-4">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.courseId);
            return (
              <div
                key={item.courseId}
                className={`premium-card flex items-center gap-4 rounded-[--radius-lg] p-4 transition-all duration-300 ease-out ${
                  isSelected
                    ? "ring-2 ring-[--color-primary] ring-offset-2 ring-offset-[--color-background]"
                    : "opacity-50 saturate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(item.courseId)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `Deselect ${item.title}` : `Select ${item.title}`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ease-out ${
                    isSelected
                      ? "border-[--color-primary] bg-[--color-primary] shadow-[var(--shadow-brand)]"
                      : "border-[--color-border] bg-transparent hover:border-[--color-primary]"
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 text-white transition-all duration-300 ease-out ${
                      isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    }`}
                  />
                </button>
                <div
                  className={`thumbnail-fallback relative h-16 w-28 shrink-0 overflow-hidden rounded-[--radius-sm] transition-all duration-300 ${
                    isSelected ? "" : "grayscale"
                  }`}
                >
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/courses/${item.slug}`}
                    className="line-clamp-2 text-sm font-bold text-[--color-text-primary] transition-colors hover:text-[--color-primary]"
                  >
                    {item.title}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-heading text-base font-black text-[--color-text-primary]">
                    {formatPrice(item.priceInCents)}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.courseId)}
                  aria-label={`Remove ${item.title} from cart`}
                  className="shrink-0 rounded-[--radius-sm] p-2 text-[--color-text-muted] transition-colors hover:bg-[--color-error]/10 hover:text-[--color-error]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="premium-card animate-fade-up h-fit rounded-[--radius-lg] p-6">
          <h2 className="font-heading text-lg font-black text-[--color-text-primary]">Total</h2>

          {soloItem && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[--color-text-muted]" />
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="h-9 text-xs uppercase"
                  disabled={couponState.status === "loading"}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!couponCode.trim() || couponState.status === "loading"}
                  className="rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-xs font-semibold text-[--color-text-secondary] transition-colors hover:bg-[--color-surface] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {couponState.status === "loading" ? "Checking…" : "Apply"}
                </button>
              </div>
              {couponState.status === "success" ? (
                <p className="flex items-center gap-1 text-xs font-semibold text-[--color-success]">
                  <Check className="h-3.5 w-3.5" />
                  {couponState.result.message || "Coupon applied"}
                </p>
              ) : couponState.status === "error" ? (
                <p className="text-xs font-semibold text-[--color-error]">{couponState.message}</p>
              ) : (
                <p className="text-xs text-[--color-text-muted]">
                  Coupons apply at checkout for individual courses.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
            <span className="text-sm font-bold text-[--color-text-secondary]">
              Subtotal · {selectedItems.length} of {items.length} selected
            </span>
            {soloItem && couponState.status === "success" && couponState.result.valid ? (
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-[--color-text-muted] line-through">
                  {formatPrice(couponState.result.original_price_cents)}
                </span>
                <span className="font-heading text-2xl font-black text-[--color-text-primary]">
                  {formatPrice(couponState.result.discounted_price_cents)}
                </span>
              </span>
            ) : (
              <span className="font-heading text-2xl font-black text-[--color-text-primary]">
                {formatPrice(subtotal)}
              </span>
            )}
          </div>

          {noneSelected ? (
            <Button size="lg" className="mt-5 w-full" disabled>
              Select a course to continue
            </Button>
          ) : (
            <Link href={checkoutHref} className="mt-5 block">
              <Button size="lg" className="w-full">
                {selectedItems.length > 1
                  ? `Checkout ${selectedItems.length} courses`
                  : "Proceed to checkout"}
              </Button>
            </Link>
          )}

          <div className="mt-4 flex items-start gap-2 text-xs text-[--color-text-muted]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
            <span>30-day money-back guarantee. Secure payment powered by Stripe.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
