"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Edit, BarChart2, BookOpen, Video, MessageSquare, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

const statusVariant: Record<string, "default" | "secondary" | "success" | "outline"> = {
  published: "success",
  draft: "secondary",
  archived: "outline",
};

export default function InstructorCoursesPage() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Course[]>(
          "/api/v1/courses/mine",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCourses(data);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-text-primary]">My Courses</h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Create and manage your courses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/instructor/promotions">
            <Button variant="outline" size="sm" className="gap-1">
              <TagIcon className="h-3 w-3" /> Promotions
            </Button>
          </Link>
          <CreateCourseButton token={null} onCreated={(c) => setCourses((prev) => [c, ...prev])} getToken={getToken} />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[--radius-md]" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] py-14 shadow-[var(--shadow-xs)] text-center">
          <BookOpen className="h-12 w-12 text-[--color-border]" />
          <h3 className="mt-4 font-semibold text-[--color-text-secondary]">No courses yet</h3>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Create your first course and start sharing your knowledge.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-4 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-4 shadow-[var(--shadow-xs)]"
            >
              {/* Color swatch */}
              <div className="hidden h-14 w-20 shrink-0 rounded-[--radius-sm] bg-gradient-to-br from-[--color-primary]/10 to-[--color-primary]/5 sm:block" />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[--color-text-primary] truncate">{course.title}</h3>
                  <Badge variant={statusVariant[course.status] ?? "secondary"}>
                    {course.status}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[--color-text-muted]">
                  <span>{course.enrollment_count} students</span>
                  <span>
                    {course.is_free ? "Free" : `$${(course.price_in_cents / 100).toFixed(2)}`}
                  </span>
                  {course.review_count > 0 && (
                    <span>{Number(course.rating).toFixed(1)}★ ({course.review_count})</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link href={`/instructor/courses/${course.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                </Link>
                <Link href={`/instructor/courses/${course.id}/live`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Video className="h-3 w-3" /> Live
                  </Button>
                </Link>
                <Link href={`/instructor/courses/${course.id}/discussions`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <MessageSquare className="h-3 w-3" /> Discuss
                  </Button>
                </Link>
                <Link href={`/courses/${course.slug}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <BarChart2 className="h-3 w-3" /> View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCourseButton({
  onCreated,
  getToken,
}: {
  token: null;
  onCreated: (c: Course) => void;
  getToken: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    const token = await getToken();
    try {
      const course = await apiFetch<Course>("/api/v1/courses", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          level: "all",
          language: "English",
          is_free: true,
          price_in_cents: 0,
        }),
      });
      onCreated(course);
      setTitle("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> New Course
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Course title"
          className="h-9 rounded-[--radius-sm] border border-[--color-border] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
        />
        <Button onClick={handleCreate} disabled={submitting} size="sm">
          {submitting ? "Creating…" : "Create"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setOpen(false); setTitle(""); setError(null); }}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
