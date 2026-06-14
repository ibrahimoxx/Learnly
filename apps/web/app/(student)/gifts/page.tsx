"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BookOpen, Gift, Inbox, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { GiftListRead, GiftRead } from "@/types";

const emptyGifts: GiftListRead = { sent: [], received: [] };

interface GiftSectionProps {
  items: GiftRead[];
  kind: "sent" | "received";
}

function GiftSkeletonRows() {
  return (
    <div className="mt-4 space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="premium-card flex gap-4 rounded-[--radius-md] p-4">
          <Skeleton className="h-20 w-32 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MultiGiftCard({ gift, isSent }: { gift: GiftRead; isSent: boolean }) {
  const courses = gift.courses ?? [];

  return (
    <div className="hover-lift premium-card flex items-start gap-4 rounded-[--radius-md] p-4">
      <div className="thumbnail-fallback flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[--radius-sm]">
        <Gift className="h-8 w-8 text-white/80" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[--color-text-primary]">
          {courses.length} courses {isSent ? "gifted" : "received as a gift"}
        </p>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          <span className="font-semibold text-[--color-text-primary]">
            {isSent ? "To:" : "From:"} {gift.other_user.first_name} {gift.other_user.last_name}
          </span>{" "}
          <span className="text-xs text-[--color-text-muted]">({gift.other_user.email})</span>
        </p>
        {gift.message ? (
          <p className="mt-1 text-sm italic text-[--color-text-secondary]">"{gift.message}"</p>
        ) : null}
        <ul className="mt-2 space-y-1">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.slug}`}
                className="line-clamp-1 text-sm text-[--color-text-secondary] transition-colors hover:text-[--color-primary]"
              >
                • {course.title}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[--color-text-muted]">
          {new Date(gift.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function GiftSection({ items, kind }: GiftSectionProps) {
  const isSent = kind === "sent";

  return (
    <>
      {items.length === 0 ? (
        <div className="premium-card mt-4 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
          <Gift className="h-12 w-12 text-[--color-text-muted]" />
          <p className="font-extrabold text-[--color-text-secondary]">
            {isSent ? "You haven't gifted any courses yet" : "No gifts received yet"}
          </p>
          <Link
            href={isSent ? "/courses" : "/dashboard"}
            className="mt-2 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5"
          >
            {isSent ? "Browse courses to gift" : "Go to My Learning"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((gift) =>
            gift.courses && gift.courses.length > 1 ? (
              <MultiGiftCard key={gift.id} gift={gift} isSent={isSent} />
            ) : (
            <div
              key={gift.id}
              className="hover-lift premium-card flex items-center gap-4 rounded-[--radius-md] p-4"
            >
              <div className="thumbnail-fallback flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[--radius-sm]">
                {gift.course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gift.course.image_url} alt={gift.course.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-8 w-8 text-white/80" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/courses/${gift.course.slug}`}
                  className="line-clamp-2 font-semibold text-[--color-text-primary] transition-colors hover:text-[--color-primary]"
                >
                  {gift.course.title}
                </Link>
                <p className="mt-1 text-sm text-[--color-text-secondary]">
                  <span className="font-semibold text-[--color-text-primary]">
                    {isSent ? "To:" : "From:"} {gift.other_user.first_name} {gift.other_user.last_name}
                  </span>{" "}
                  <span className="text-xs text-[--color-text-muted]">({gift.other_user.email})</span>
                </p>
                {gift.message ? (
                  <p className="mt-1 text-sm italic text-[--color-text-secondary]">"{gift.message}"</p>
                ) : null}
                <p className="mt-1 text-xs text-[--color-text-muted]">
                  {new Date(gift.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href={`/courses/${gift.course.slug}`}
                  className="rounded-[--radius-sm] bg-[--color-primary] px-4 py-1.5 text-center text-xs font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
                >
                  View course
                </Link>
              </div>
            </div>
            )
          )}
        </div>
      )}
    </>
  );
}

export default function GiftsPage() {
  const { getToken } = useAuth();
  const [gifts, setGifts] = useState<GiftListRead>(emptyGifts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<GiftListRead>("/api/v1/gifts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGifts(data);
      } catch {
        setGifts(emptyGifts);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [getToken]);

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Course gifts
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Gifts</h1>

        <section>
          <h2 className="mt-8 mb-3 flex items-center gap-2 text-xl font-extrabold text-[--color-text-primary]">
            <Send className="h-5 w-5" />
            Gifts Sent
          </h2>
          {loading ? <GiftSkeletonRows /> : <GiftSection items={gifts.sent} kind="sent" />}
        </section>

        <section>
          <h2 className="mt-8 mb-3 flex items-center gap-2 text-xl font-extrabold text-[--color-text-primary]">
            <Inbox className="h-5 w-5" />
            Gifts Received
          </h2>
          {loading ? <GiftSkeletonRows /> : <GiftSection items={gifts.received} kind="received" />}
        </section>
      </div>
    </div>
  );
}
