"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  instructor_id: string;
  enrollment_count: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  in_review: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-600",
  archived: "bg-red-100 text-red-600",
};

const ACTIONS: Record<string, { label: string; next: string }[]> = {
  in_review: [
    { label: "Approve", next: "published" },
    { label: "Reject", next: "draft" },
  ],
  published: [{ label: "Unpublish", next: "archived" }],
  archived: [{ label: "Restore", next: "published" }],
  draft: [{ label: "Archive", next: "archived" }],
};

export default function AdminCoursesPage() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load(statusFilter = "") {
    const token = await getToken();
    const url = statusFilter
      ? `/api/v1/admin/courses?status_filter=${statusFilter}`
      : "/api/v1/admin/courses";
    try {
      const data = await apiFetch<AdminCourse[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load courses";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(courseId: string, newStatus: string) {
    setUpdating(courseId);
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/admin/courses/${courseId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Course ${newStatus}`);
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: newStatus } : c))
      );
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[--color-text-primary]">Course Moderation</h1>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setLoading(true); }}
          className="rounded-[--radius-sm] border border-[--color-border] px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="in_review">Pending review</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-[--radius-md]" />)}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-[--color-text-muted] text-center py-10">No courses found.</p>
      ) : (
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] overflow-hidden shadow-[var(--shadow-xs)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Title", "Status", "Enrollments", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {courses.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-[--color-primary-subtle]/40">
                  <td className="px-4 py-3 font-medium text-[--color-text-primary] max-w-xs truncate">
                    {c.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{c.enrollment_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(ACTIONS[c.status] ?? []).map(({ label, next }) => (
                        <button
                          key={next}
                          onClick={() => updateStatus(c.id, next)}
                          disabled={updating === c.id}
                          className="rounded border border-[--color-border] px-2.5 py-1 text-xs font-semibold text-[--color-text-secondary] hover:bg-[--color-surface] disabled:opacity-50 transition-colors"
                        >
                          {updating === c.id ? "…" : label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
