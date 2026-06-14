"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { ShieldCheck, Lock, ShoppingCart, AlertCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useCartStore, type CartItem } from "@/lib/stores/cart-store";
import type { Course } from "@/types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

function TrustNotice() {
  return (
    <div className="mt-6 space-y-3 border-t border-[--color-border] pt-4 text-xs text-[--color-text-muted]">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
        <span>Payments are processed securely by Stripe. Your card details never touch Learnly servers.</span>
      </div>
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
        <span>30-day money-back guarantee — full refund if you&apos;re not satisfied.</span>
      </div>
    </div>
  );
}

function PayButton({
  label,
  onClick,
  loading,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
}) {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button size="lg" className="w-full">{label}</Button>
      </SignInButton>
    );
  }

  return (
    <Button size="lg" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? "Processing…" : label}
    </Button>
  );
}

function OrderSummaryCard({
  courseId,
  title,
  imageUrl,
  priceInCents,
  onPay,
  paying,
}: {
  courseId: string;
  title: string;
  imageUrl?: string;
  priceInCents: number;
  onPay: () => void;
  paying: boolean;
}) {
  return (
    <div className="premium-card animate-fade-up rounded-[--radius-lg] p-6">
      <h2 className="font-heading text-lg font-black text-[--color-text-primary]">Order summary</h2>

      <div className="mt-4 flex items-center gap-4">
        <div className="thumbnail-fallback relative h-16 w-28 shrink-0 overflow-hidden rounded-[--radius-sm]">
          {imageUrl && <Image src={imageUrl} alt={title} fill className="object-cover" />}
        </div>
        <p className="line-clamp-2 text-sm font-bold text-[--color-text-primary]">{title}</p>
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
        <span className="text-sm font-bold text-[--color-text-secondary]">Total due today</span>
        <span className="font-heading text-2xl font-black text-[--color-text-primary]">
          {formatPrice(priceInCents)}
        </span>
      </div>

      <div className="mt-5">
        <PayButton label={`Pay ${formatPrice(priceInCents)}`} onClick={onPay} loading={paying} />
      </div>

      <Link
        href={`/payment/checkout/gift?courseId=${courseId}`}
        className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-[--color-primary] transition-colors hover:underline"
      >
        <Gift className="h-4 w-4" />
        Gift this course instead
      </Link>

      <TrustNotice />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="skeleton-shimmer h-8 w-48 rounded-[--radius-sm]" />
      <div className="skeleton-shimmer mt-6 h-64 rounded-[--radius-lg]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="premium-shell mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-[--color-primary-subtle] shadow-[var(--shadow-brand)]">
        <ShoppingCart className="h-9 w-9 text-[--color-primary]" />
      </div>
      <h1 className="animate-fade-up mt-6 font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
        Nothing to check out
      </h1>
      <p className="animate-fade-up mt-2 max-w-md text-[--color-text-secondary]">
        Your cart is empty. Add a course to your cart or buy now from a course page.
      </p>
      <Link href="/courses" className="mt-6">
        <Button size="lg">Browse courses</Button>
      </Link>
    </div>
  );
}

function CourseNotFound() {
  return (
    <div className="premium-shell mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-[--color-error]/10 shadow-[var(--shadow-md)]">
        <AlertCircle className="h-9 w-9 text-[--color-error]" />
      </div>
      <h1 className="animate-fade-up mt-6 font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
        Course not found
      </h1>
      <p className="animate-fade-up mt-2 max-w-md text-[--color-text-secondary]">
        The course you&apos;re trying to buy doesn&apos;t exist or is no longer available.
      </p>
      <Link href="/courses" className="mt-6">
        <Button size="lg">Browse courses</Button>
      </Link>
    </div>
  );
}

function MultiItemCheckout({
  items,
  onPay,
  payingId,
  onPayAll,
  onGiftAll,
  payingMulti,
}: {
  items: CartItem[];
  onPay: (id: string) => void;
  payingId: string | null;
  onPayAll: () => void;
  onGiftAll: () => void;
  payingMulti: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.priceInCents, 0);
  const busy = payingId !== null || payingMulti;

  return (
    <div className="premium-shell mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="animate-fade-up font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
        Checkout
      </h1>
      <p className="mt-2 text-sm text-[--color-text-secondary]">
        Pay for one, several, or all at once — your choice.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="stagger-children space-y-4">
          {items.map((item) => (
            <div key={item.courseId} className="premium-card flex items-center gap-4 rounded-[--radius-lg] p-4">
              <div className="thumbnail-fallback relative h-14 w-24 shrink-0 overflow-hidden rounded-[--radius-sm]">
                {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold text-[--color-text-primary]">{item.title}</p>
                <p className="mt-1 text-sm font-extrabold text-[--color-text-secondary]">{formatPrice(item.priceInCents)}</p>
              </div>
              <Button onClick={() => onPay(item.courseId)} disabled={busy}>
                {payingId === item.courseId ? "Processing…" : "Pay"}
              </Button>
            </div>
          ))}

          <Link href="/cart" className="inline-block text-sm font-bold text-[--color-primary] hover:underline">
            ← Back to cart
          </Link>
        </div>

        <div className="premium-card animate-fade-up sticky top-24 rounded-[--radius-lg] p-5">
          <h2 className="font-heading text-lg font-black text-[--color-text-primary]">Order summary</h2>

          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.courseId} className="flex items-start justify-between gap-3 text-sm">
                <span className="line-clamp-2 font-bold text-[--color-text-secondary]">{item.title}</span>
                <span className="shrink-0 font-extrabold text-[--color-text-primary]">{formatPrice(item.priceInCents)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
            <span className="text-sm font-bold text-[--color-text-secondary]">
              {items.length} courses
            </span>
            <span className="font-heading text-2xl font-black text-[--color-text-primary]">
              {formatPrice(total)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <Button className="w-full" onClick={onPayAll} disabled={busy}>
              {payingMulti ? "Processing…" : `Pay all (${formatPrice(total)})`}
            </Button>
            <Button variant="outline" className="w-full" onClick={onGiftAll} disabled={busy}>
              <Gift className="mr-1.5 h-4 w-4" />
              Gift all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("courseId");
  const courseIdsParam = searchParams.get("courseIds");
  const { getToken } = useAuth();
  const { items } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoadFailed, setCourseLoadFailed] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(Boolean(courseId));
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payingMulti, setPayingMulti] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setLoadingCourse(true);
    apiFetch<Course>(`/api/v1/courses/${courseId}`)
      .then((data) => {
        if (!cancelled) setCourse(data);
      })
      .catch(() => {
        if (!cancelled) setCourseLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCourse(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function pay(targetCourseId: string) {
    setPayingId(targetCourseId);
    try {
      const token = await getToken();
      const { checkout_url } = await apiFetch<CheckoutSessionResponse>("/api/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_id: targetCourseId }),
      });
      window.location.href = checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error(msg);
      setPayingId(null);
    }
  }

  async function payMany(courseIds: string[]) {
    setPayingMulti(true);
    try {
      const token = await getToken();
      const { checkout_url } = await apiFetch<CheckoutSessionResponse>("/api/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_ids: courseIds }),
      });
      window.location.href = checkout_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error(msg);
      setPayingMulti(false);
    }
  }

  if (!mounted || loadingCourse) {
    return <CheckoutSkeleton />;
  }

  // Direct course checkout via ?courseId=
  if (courseId) {
    if (courseLoadFailed || !course) return <CourseNotFound />;

    if (course.is_free) {
      return (
        <div className="premium-shell mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <h1 className="font-heading text-2xl font-black text-[--color-text-primary]">This course is free</h1>
          <p className="mt-2 text-[--color-text-secondary]">Enroll directly from the course page — no payment needed.</p>
          <Link href={`/courses/${course.slug}`} className="mt-6">
            <Button size="lg">Go to course</Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="animate-fade-up font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
          Checkout
        </h1>
        <div className="mt-6">
          <OrderSummaryCard
            courseId={course.id}
            title={course.title}
            imageUrl={course.image_url}
            priceInCents={course.price_in_cents}
            onPay={() => pay(course.id)}
            paying={payingId === course.id}
          />
        </div>
      </div>
    );
  }

  // Cart-based checkout
  if (items.length === 0) return <EmptyState />;

  const requestedIds = courseIdsParam ? new Set(courseIdsParam.split(",").filter(Boolean)) : null;
  const filteredItems = requestedIds ? items.filter((item) => requestedIds.has(item.courseId)) : items;
  const checkoutItems = filteredItems.length > 0 ? filteredItems : items;

  if (checkoutItems.length === 1 && checkoutItems[0]) {
    const item = checkoutItems[0];
    return (
      <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="animate-fade-up font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
          Checkout
        </h1>
        <div className="mt-6">
          <OrderSummaryCard
            courseId={item.courseId}
            title={item.title}
            imageUrl={item.imageUrl}
            priceInCents={item.priceInCents}
            onPay={() => pay(item.courseId)}
            paying={payingId === item.courseId}
          />
        </div>
      </div>
    );
  }

  return (
    <MultiItemCheckout
      items={checkoutItems}
      onPay={pay}
      payingId={payingId}
      onPayAll={() => payMany(checkoutItems.map((item) => item.courseId))}
      onGiftAll={() => router.push(`/payment/checkout/gift?courseIds=${checkoutItems.map((item) => item.courseId).join(",")}`)}
      payingMulti={payingMulti}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}
