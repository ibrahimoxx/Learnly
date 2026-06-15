"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Review } from "@/types";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < rating ? "fill-[--color-star] text-[--color-star]" : "text-[--color-border]"
          )}
        />
      ))}
    </div>
  );
}

export default function PerformanceReviewsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const result = await apiFetch<Review[]>("/api/v1/instructor/performance/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(result);
    } catch {
      toast.error("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function respond(reviewId: string) {
    const response = (drafts[reviewId] || "").trim();
    if (!response) return;
    const token = await getToken();
    setSubmitting(reviewId);
    try {
      const updated = await apiFetch<Review>(`/api/v1/instructor/performance/reviews/${reviewId}/respond`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response }),
      });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setDrafts((prev) => ({ ...prev, [reviewId]: "" }));
      toast.success("Response posted.");
    } catch {
      toast.error("Failed to post response.");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (reviews.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <h2 className="font-semibold text-[--color-text-primary]">No reviews yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Reviews left by your students will appear here.
        </p>
        <Link
          href="/instructor/courses"
          className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to My Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="premium-card rounded-[--radius-lg] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-[--color-text-primary]">{review.student_name}</p>
              <p className="text-xs text-[--color-text-muted]">{review.course_title}</p>
            </div>
            <Stars rating={review.rating} />
          </div>
          {review.comment && (
            <p className="mt-3 text-sm text-[--color-text-secondary]">{review.comment}</p>
          )}
          <p className="mt-2 text-xs text-[--color-text-muted]">
            {new Date(review.created_at).toLocaleDateString()}
          </p>

          {review.instructor_response ? (
            <div className="mt-4 rounded-[--radius-md] bg-[--color-surface-raised] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                Your response
              </p>
              <p className="mt-1 text-sm text-[--color-text-secondary]">{review.instructor_response}</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={drafts[review.id] || ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                placeholder="Write a response to this review…"
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={() => respond(review.id)}
                disabled={submitting === review.id || !(drafts[review.id] || "").trim()}
                size="sm"
                className="sm:self-end"
              >
                {submitting === review.id ? "Posting…" : "Respond"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
