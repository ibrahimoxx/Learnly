"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Heart, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { normalizeYtThumbnail } from "@/lib/utils";
import type { WishlistItem } from "@/types";

export default function WishlistPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<WishlistItem[]>("/api/v1/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function remove(courseId: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/wishlist/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.course_id !== courseId));
    } catch {
      // ignore
    }
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
      <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
        Saved courses
      </span>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">My Wishlist</h1>

      {loading ? (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="premium-card flex gap-4 rounded-[--radius-md] p-4">
              <Skeleton className="h-20 w-32 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="premium-card mt-10 flex flex-col items-center gap-3 rounded-[--radius-lg] py-16 text-center">
          <img src="/brand/empty-state.svg" alt="" className="h-32 w-auto" />
          <Heart className="h-12 w-12 text-[--color-error]" />
          <p className="relative font-extrabold text-[--color-text-secondary]">Your wishlist is empty</p>
          <p className="text-sm text-[--color-text-muted]">Save courses you want to take later.</p>
          <Link
            href="/courses"
            className="mt-2 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5"
          >
            <BookOpen className="h-4 w-4" /> Browse courses
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="hover-lift premium-card flex items-center gap-4 rounded-[--radius-md] p-4"
            >
              {/* Thumbnail */}
              <div className="thumbnail-fallback flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[--radius-sm]">
                {item.course_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeYtThumbnail(item.course_image_url ?? "")} alt={item.course_title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-8 w-8 text-white/80" />
                )}
              </div>

              {/* Info */}
              <div className="relative flex-1 min-w-0">
                <Link
                  href={`/courses/${item.course_slug}`}
                  className="font-semibold text-[--color-text-primary] hover:text-[--color-primary] transition-colors line-clamp-2"
                >
                  {item.course_title}
                </Link>
                <p className="mt-1 text-sm font-bold text-[--color-text-primary]">
                  {item.course_is_free ? "Free" : `$${(item.course_price_in_cents / 100).toFixed(2)}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-col gap-2">
                <Link
                  href={`/courses/${item.course_slug}`}
                  className="rounded-[--radius-sm] bg-[--color-primary] px-4 py-1.5 text-center text-xs font-extrabold text-white hover:bg-[--color-primary-hover] transition-colors"
                >
                  View course
                </Link>
                <button
                  onClick={() => remove(item.course_id)}
                  className="rounded-[--radius-sm] border border-[--color-border] px-4 py-1.5 text-xs font-extrabold text-[--color-text-muted] hover:border-[--color-error]/30 hover:text-[--color-error] transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
