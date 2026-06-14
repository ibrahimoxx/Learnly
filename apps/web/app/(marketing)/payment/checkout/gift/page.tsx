"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { Gift, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const giftSchema = z.object({
  recipientEmail: z.string().email("Enter a valid email address"),
  giftMessage: z
    .string()
    .max(500, "Message must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
});

type GiftFormValues = z.infer<typeof giftSchema>;

interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^\d+:\s*(.*)$/s);
  const body = match?.[1];
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return fallback;
  }
  return fallback;
}

function GiftSkeleton() {
  return (
    <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="skeleton-shimmer h-8 w-48 rounded-[--radius-sm]" />
      <div className="skeleton-shimmer mt-6 h-80 rounded-[--radius-lg]" />
    </div>
  );
}

function MissingCourse() {
  return (
    <div className="premium-shell mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="animate-scale-in flex h-20 w-20 items-center justify-center rounded-full bg-[--color-primary-subtle] shadow-[var(--shadow-brand)]">
        <Gift className="h-9 w-9 text-[--color-primary]" />
      </div>
      <h1 className="animate-fade-up mt-6 font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
        Choose a course to gift
      </h1>
      <p className="animate-fade-up mt-2 max-w-md text-[--color-text-secondary]">
        Pick a course from the catalog, then choose &ldquo;Gift this course&rdquo; to send it to a friend.
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
        The course you&apos;re trying to gift doesn&apos;t exist or is no longer available.
      </p>
      <Link href="/courses" className="mt-6">
        <Button size="lg">Browse courses</Button>
      </Link>
    </div>
  );
}

function MultiGiftContent({ courseIds }: { courseIds: string[] }) {
  const { getToken, isSignedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    setLoadingCourses(true);
    Promise.all(
      courseIds.map((id) =>
        apiFetch<Course>(`/api/v1/courses/${id}`).catch(() => null)
      )
    )
      .then((results) => {
        if (!cancelled) {
          setCourses(results.filter((course): course is Course => course !== null));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCourses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseIds]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GiftFormValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: { recipientEmail: "", giftMessage: "" },
  });

  const payableCourses = courses.filter((course) => !course.is_free);
  const total = payableCourses.reduce((sum, course) => sum + course.price_in_cents, 0);

  async function onSubmit(values: GiftFormValues) {
    if (payableCourses.length === 0) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const { checkout_url } = await apiFetch<CheckoutSessionResponse>("/api/v1/checkout/gift-sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_ids: payableCourses.map((course) => course.id),
          recipient_email: values.recipientEmail,
          gift_message: values.giftMessage || null,
        }),
      });
      window.location.href = checkout_url;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't start gift checkout. Please try again."));
      setSubmitting(false);
    }
  }

  if (!mounted || loadingCourses) return <GiftSkeleton />;
  if (payableCourses.length === 0) return <MissingCourse />;

  return (
    <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="animate-fade-up flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[--color-primary-subtle] text-[--color-primary] shadow-[var(--shadow-brand)]">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
            Gift these courses
          </h1>
          <p className="text-sm text-[--color-text-secondary]">
            Send {payableCourses.length} course{payableCourses.length > 1 ? "s" : ""} to someone learning
          </p>
        </div>
      </div>

      <div className="premium-card animate-fade-up mt-6 rounded-[--radius-lg] p-6">
        <div className="space-y-3">
          {payableCourses.map((course) => (
            <div key={course.id} className="flex items-center gap-4">
              <div className="thumbnail-fallback relative h-14 w-24 shrink-0 overflow-hidden rounded-[--radius-sm]">
                {course.image_url && <Image src={course.image_url} alt={course.title} fill className="object-cover" />}
              </div>
              <p className="line-clamp-2 flex-1 text-sm font-bold text-[--color-text-primary]">{course.title}</p>
              <span className="text-sm font-extrabold text-[--color-text-secondary]">
                {formatPrice(course.price_in_cents)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
          <span className="text-sm font-bold text-[--color-text-secondary]">Gift price</span>
          <span className="font-heading text-2xl font-black text-[--color-text-primary]">
            {formatPrice(total)}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recipientEmail">Recipient&apos;s email</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="friend@example.com"
              autoComplete="email"
              {...register("recipientEmail")}
            />
            <p className="text-xs text-[--color-text-muted]">
              They&apos;ll need an existing Learnly account to receive this gift.
            </p>
            {errors.recipientEmail && (
              <p className="text-xs font-semibold text-[--color-error]">{errors.recipientEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="giftMessage">Personal message (optional)</Label>
            <Textarea
              id="giftMessage"
              placeholder="Enjoy these courses — thought you'd love them!"
              rows={4}
              {...register("giftMessage")}
            />
            {errors.giftMessage && (
              <p className="text-xs font-semibold text-[--color-error]">{errors.giftMessage.message}</p>
            )}
          </div>

          {isSignedIn ? (
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Processing…" : `Pay ${formatPrice(total)} as a gift`}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button type="button" size="lg" className="w-full">
                Sign in to send a gift
              </Button>
            </SignInButton>
          )}

          <div className="flex items-start gap-2 text-xs text-[--color-text-muted]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
            <span>Secure payment powered by Stripe. 30-day money-back guarantee.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function GiftContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const courseIdsParam = searchParams.get("courseIds");
  const { getToken, isSignedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoadFailed, setCourseLoadFailed] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(Boolean(courseId));
  const [submitting, setSubmitting] = useState(false);

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GiftFormValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: { recipientEmail: "", giftMessage: "" },
  });

  async function onSubmit(values: GiftFormValues) {
    if (!course) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const { checkout_url } = await apiFetch<CheckoutSessionResponse>("/api/v1/checkout/gift-sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_id: course.id,
          recipient_email: values.recipientEmail,
          gift_message: values.giftMessage || null,
        }),
      });
      window.location.href = checkout_url;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't start gift checkout. Please try again."));
      setSubmitting(false);
    }
  }

  if (!courseId && courseIdsParam) {
    const ids = courseIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length > 1) return <MultiGiftContent courseIds={ids} />;
  }

  if (!mounted || loadingCourse) return <GiftSkeleton />;
  if (!courseId) return <MissingCourse />;
  if (courseLoadFailed || !course) return <CourseNotFound />;

  if (course.is_free) {
    return (
      <div className="premium-shell mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h1 className="font-heading text-2xl font-black text-[--color-text-primary]">This course is free</h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Free courses can&apos;t be gifted — share the course link instead.
        </p>
        <Link href={`/courses/${course.slug}`} className="mt-6">
          <Button size="lg">Go to course</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="premium-shell mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="animate-fade-up flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[--color-primary-subtle] text-[--color-primary] shadow-[var(--shadow-brand)]">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
            Gift this course
          </h1>
          <p className="text-sm text-[--color-text-secondary]">Send {course.title} to someone learning</p>
        </div>
      </div>

      <div className="premium-card animate-fade-up mt-6 rounded-[--radius-lg] p-6">
        <div className="flex items-center gap-4">
          <div className="thumbnail-fallback relative h-16 w-28 shrink-0 overflow-hidden rounded-[--radius-sm]">
            {course.image_url && <Image src={course.image_url} alt={course.title} fill className="object-cover" />}
          </div>
          <p className="line-clamp-2 text-sm font-bold text-[--color-text-primary]">{course.title}</p>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-[--color-border] pt-4">
          <span className="text-sm font-bold text-[--color-text-secondary]">Gift price</span>
          <span className="font-heading text-2xl font-black text-[--color-text-primary]">
            {formatPrice(course.price_in_cents)}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recipientEmail">Recipient&apos;s email</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="friend@example.com"
              autoComplete="email"
              {...register("recipientEmail")}
            />
            <p className="text-xs text-[--color-text-muted]">
              They&apos;ll need an existing Learnly account to receive this gift.
            </p>
            {errors.recipientEmail && (
              <p className="text-xs font-semibold text-[--color-error]">{errors.recipientEmail.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="giftMessage">Personal message (optional)</Label>
            <Textarea
              id="giftMessage"
              placeholder="Enjoy this course — thought you'd love it!"
              rows={4}
              {...register("giftMessage")}
            />
            {errors.giftMessage && (
              <p className="text-xs font-semibold text-[--color-error]">{errors.giftMessage.message}</p>
            )}
          </div>

          {isSignedIn ? (
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Processing…" : `Pay ${formatPrice(course.price_in_cents)} as a gift`}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button type="button" size="lg" className="w-full">
                Sign in to send a gift
              </Button>
            </SignInButton>
          )}

          <div className="flex items-start gap-2 text-xs text-[--color-text-muted]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
            <span>Secure payment powered by Stripe. 30-day money-back guarantee.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GiftCheckoutPage() {
  return (
    <Suspense fallback={<GiftSkeleton />}>
      <GiftContent />
    </Suspense>
  );
}
