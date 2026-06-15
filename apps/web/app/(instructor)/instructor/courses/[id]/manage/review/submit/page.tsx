"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle2, Circle, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import type { Course, Section, Lesson } from "@/types";

interface ChecklistItem {
  label: string;
  done: boolean;
  href: string;
}

export default function CourseReviewSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const [courseData, sectionsData] = await Promise.all([
        apiFetch<Course>(`/api/v1/courses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch<Section[]>(`/api/v1/courses/${id}/sections`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const lessonsPerSection = await Promise.all(
        sectionsData.map((s) =>
          apiFetch<Lesson[]>(`/api/v1/sections/${s.id}/lessons`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => [] as Lesson[])
        )
      );
      const totalLessons = lessonsPerSection.reduce((sum, l) => sum + l.length, 0);

      setCourse(courseData);
      setItems([
        {
          label: "Course has at least one section with one lesson",
          done: sectionsData.length > 0 && totalLessons > 0,
          href: `/instructor/courses/${id}/edit`,
        },
        {
          label: "Title and description are filled in",
          done: Boolean(courseData.title?.trim() && courseData.description?.trim()),
          href: `/instructor/courses/${id}/edit`,
        },
        {
          label: "At least 4 learning objectives added",
          done: (courseData.learning_objectives?.filter((o) => o.trim()).length ?? 0) >= 4,
          href: `/instructor/courses/${id}/manage/goals`,
        },
        {
          label: "Pricing configured",
          done: courseData.is_free || courseData.price_in_cents > 0,
          href: `/instructor/courses/${id}/manage/pricing`,
        },
        {
          label: "Course thumbnail uploaded",
          done: Boolean(courseData.image_url),
          href: `/instructor/courses/${id}/edit`,
        },
      ]);
    } catch {
      toast.error("Failed to load review checklist.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function submitForReview() {
    const token = await getToken();
    setSubmitting(true);
    try {
      const updated = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "in_review" }),
      });
      setCourse(updated);
      toast.success("Course submitted for review.");
    } catch {
      toast.error("Failed to submit for review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  const allDone = items.every((i) => i.done);
  const alreadySubmitted = course?.status === "in_review" || course?.status === "published";

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[--color-text-primary]">Submission Checklist</h2>
          {course && (
            <Badge variant={course.status === "published" ? "success" : "secondary"}>
              {course.status}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Complete these steps before submitting your course for review.
        </p>

        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] px-4 py-3 transition-colors hover:bg-[--color-surface]"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[--color-success]" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-[--color-text-muted]" />
              )}
              <span className="text-sm text-[--color-text-primary]">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/co-instructors`}>
          <Button variant="outline" size="sm">Back: Co-Instructors</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/instructor/courses/${id}/edit`}>
            <Button variant="outline" size="sm">Back to curriculum</Button>
          </Link>
          {alreadySubmitted ? (
            <Button size="sm" disabled className="gap-1">
              <CheckCircle2 className="h-4 w-4" /> Already {course?.status}
            </Button>
          ) : (
            <Button onClick={submitForReview} disabled={!allDone || submitting} size="sm" className="gap-1">
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
