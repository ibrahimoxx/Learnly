"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Star, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "./star-rating";
import { apiFetch } from "@/lib/api";
import type { Review, Enrollment } from "@/types";

interface ReviewSectionProps {
  courseId: string;
  initialReviews: Review[];
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-7 w-7 fill-current transition-all ${
              star <= active
                ? "text-[--color-star] drop-shadow-[0_0_6px_color-mix(in_oklch,var(--color-star)_45%,transparent)]"
                : "text-[--color-border-strong]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ courseId, initialReviews }: ReviewSectionProps) {
  const { isSignedIn, getToken } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setEnrollmentChecked(true);
      return;
    }
    async function checkEnrollment() {
      const token = await getToken();
      try {
        const enrollments = await apiFetch<Enrollment[]>("/api/v1/enrollments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const enrolled = enrollments.some((e) => e.course_id === courseId);
        setIsEnrolled(enrolled);
        if (enrolled) {
          const fresh = await apiFetch<Review[]>(`/api/v1/courses/${courseId}/reviews`);
          setReviews(fresh);
          const userId = enrollments.find((e) => e.course_id === courseId)?.student_id;
          if (userId) {
            setAlreadyReviewed(fresh.some((r) => r.student_id === userId));
          }
        }
      } catch {
        // Not enrolled or error — no form shown
      } finally {
        setEnrollmentChecked(true);
      }
    }
    checkEnrollment();
  }, [isSignedIn, courseId, getToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const newReview = await apiFetch<Review>(`/api/v1/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      setReviews((prev) => [newReview, ...prev]);
      setAlreadyReviewed(true);
      setRating(0);
      setComment("");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("409")) {
        setError("You already reviewed this course.");
        setAlreadyReviewed(true);
      } else {
        setError("Failed to submit review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-[--color-text-primary]">
        Student Reviews
      </h2>

      {reviews.length > 0 && (
        <div className="mt-3 flex items-center gap-4">
          <span className="text-5xl font-bold text-[--color-star]">{avgRating.toFixed(1)}</span>
          <div>
            <StarRating rating={avgRating} count={reviews.length} size="md" />
            <p className="mt-1 text-xs text-[--color-text-muted]">Course Rating</p>
          </div>
        </div>
      )}

      {/* Review form for enrolled students */}
      {!enrollmentChecked ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isEnrolled && !alreadyReviewed ? (
        <form
          onSubmit={handleSubmit}
          className="premium-card mt-6 rounded-[--radius-lg] p-5"
        >
          <h3 className="font-semibold text-[--color-text-primary]">Leave a Review</h3>
          <div className="mt-3">
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this course (optional)"
            rows={3}
            maxLength={2000}
            className="mt-3 w-full resize-none rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
          />
          {error && <p className="mt-1 text-xs text-[--color-error]">{error}</p>}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="mt-3 rounded-[--radius-sm] bg-[--color-primary] px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[--color-primary-hover] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      ) : isEnrolled && alreadyReviewed ? (
        <p className="mt-4 text-sm text-[--color-success]">You have reviewed this course.</p>
      ) : null}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[--color-primary-subtle]">
            <MessageSquare className="h-6 w-6 text-[--color-primary]" />
          </span>
          <p className="text-sm font-medium text-[--color-text-secondary]">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-[--color-border]">
          {reviews.map((review) => (
            <div key={review.id} className="py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[--color-primary-subtle] text-sm font-extrabold text-[--brand-800]">
                  {review.student_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[--color-text-primary]">
                      {review.student_name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3 w-3 fill-current ${s <= review.rating ? "text-[--color-star]" : "text-[--color-border-strong]"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-[--color-text-muted]">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-1.5 text-sm text-[--color-text-secondary] leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
