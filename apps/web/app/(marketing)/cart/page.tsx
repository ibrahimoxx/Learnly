"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Trash2, Tag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/stores/cart-store";

function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

export default function CartPage() {
  const { items, removeItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="premium-shell mx-auto max-w-5xl px-4 py-16 sm:px-6" />;
  }

  const subtotal = items.reduce((sum, item) => sum + item.priceInCents, 0);
  const soloItem = items.length === 1 ? items[0] : undefined;
  const checkoutHref = soloItem ? `/payment/checkout?courseId=${soloItem.courseId}` : "/payment/checkout";

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
        {/* Line items */}
        <div className="stagger-children space-y-4">
          {items.map((item) => (
            <div
              key={item.courseId}
              className="premium-card flex items-center gap-4 rounded-[--radius-lg] p-4"
            >
              <div className="thumbnail-fallback relative h-16 w-28 shrink-0 overflow-hidden rounded-[--radius-sm]">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/courses/${item.slug}`}
                  className="line-clamp-2 text-sm font-bold text-[--color-text-primary] hover:text-[--color-primary] transition-colors"
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
          ))}
        </div>

        {/* Summary */}
        <div className="premium-card animate-fade-up h-fit rounded-[--radius-lg] p-6">
          <h2 className="font-heading text-lg font-black text-[--color-text-primary]">Total</h2>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[--color-text-muted]" />
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="h-9 text-xs uppercase"
              />
              <button className="rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-xs font-semibold text-[--color-text-secondary] transition-colors hover:bg-[--color-surface]">
                Apply
              </button>
            </div>
            <p className="text-xs text-[--color-text-muted]">
              Coupons apply at checkout for individual courses.
            </p>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
            <span className="text-sm font-bold text-[--color-text-secondary]">Subtotal</span>
            <span className="font-heading text-2xl font-black text-[--color-text-primary]">
              {formatPrice(subtotal)}
            </span>
          </div>

          <Link href={checkoutHref} className="mt-5 block">
            <Button size="lg" className="w-full">Proceed to checkout</Button>
          </Link>

          <div className="mt-4 flex items-start gap-2 text-xs text-[--color-text-muted]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
            <span>30-day money-back guarantee. Secure payment powered by Stripe.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
