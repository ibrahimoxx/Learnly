"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Plus, Trash2, GripVertical, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { LearningPath, Course } from "@/types";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPathPage({ params }: Props) {
  const { id } = use(params);
  const { getToken } = useAuth();
  const router = useRouter();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addCourseId, setAddCourseId] = useState("");

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const [allPaths, instructorCourses] = await Promise.all([
          apiFetch<LearningPath[]>("/api/v1/learning-paths", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<Course[]>("/api/v1/courses/mine", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => [] as Course[]),
        ]);

        const found = allPaths.find((p) => p.id === id);
        if (!found) { router.push("/instructor/paths"); return; }

        const detail = await apiFetch<{ courses: Course[] }>(`/api/v1/learning-paths/${found.slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPath(found);
        setTitle(found.title);
        setDescription(found.description ?? "");
        setCourses(detail.courses ?? []);
        setMyCourses(instructorCourses);
      } catch {
        router.push("/instructor/paths");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, getToken, router]);

  async function save() {
    if (!path) return;
    setSaving(true);
    try {
      const token = await getToken();
      const updated = await apiFetch<LearningPath>(`/api/v1/learning-paths/${path.slug}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      setPath(updated);
      toast.success("Saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!path) return;
    setSaving(true);
    try {
      const token = await getToken();
      const newStatus = path.status === "published" ? "draft" : "published";
      const updated = await apiFetch<LearningPath>(`/api/v1/learning-paths/${path.slug}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setPath(updated);
      toast.success(newStatus === "published" ? "Path published" : "Path unpublished");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function addCourse() {
    if (!path || !addCourseId) return;
    try {
      const token = await getToken();
      await apiFetch(`/api/v1/learning-paths/${path.slug}/courses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_id: addCourseId, position: courses.length }),
      });
      const course = myCourses.find((c) => c.id === addCourseId);
      if (course) setCourses((prev) => [...prev, course]);
      setAddCourseId("");
      toast.success("Course added");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("409")) toast.error("Course already in path");
      else toast.error(msg);
    }
  }

  async function removeCourse(courseId: string) {
    if (!path) return;
    try {
      const token = await getToken();
      await apiFetch(`/api/v1/learning-paths/${path.slug}/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      toast.success("Course removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-[--radius-md]" />
        <Skeleton className="h-60 w-full rounded-[--radius-md]" />
      </div>
    );
  }

  if (!path) return null;

  const availableToAdd = myCourses.filter(
    (c) => c.status === "published" && !courses.find((cc) => cc.id === c.id)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/instructor/paths" className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[--color-text-primary]">Edit Path</h1>
        <Badge variant={path.status === "published" ? "success" : "secondary"}>{path.status}</Badge>
      </div>

      {/* Details */}
      <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-5 shadow-[var(--shadow-xs)] space-y-4">
        <h2 className="text-sm font-semibold text-[--color-text-primary]">Details</h2>
        <div>
          <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30 resize-none"
            placeholder="What will students learn from this path?"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          <Button size="sm" variant="outline" onClick={togglePublish} disabled={saving}>
            {path.status === "published" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Courses */}
      <div className="mt-5 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-5 shadow-[var(--shadow-xs)]">
        <h2 className="mb-4 text-sm font-semibold text-[--color-text-primary] flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[--color-primary]" />
          Courses ({courses.length})
        </h2>

        {courses.length === 0 ? (
          <p className="text-sm text-[--color-text-muted] text-center py-6">No courses yet. Add your first course below.</p>
        ) : (
          <ul className="space-y-2 mb-5">
            {courses.map((course, idx) => (
              <li
                key={course.id}
                className="flex items-center gap-3 rounded-[--radius-sm] border border-[--color-border] px-3 py-2.5"
              >
                <GripVertical className="h-4 w-4 text-[--color-text-muted] shrink-0" />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[--color-primary]/10 text-xs font-bold text-[--color-primary]">
                  {idx + 1}
                </span>
                <p className="flex-1 truncate text-sm font-medium text-[--color-text-primary]">{course.title}</p>
                <button
                  onClick={() => removeCourse(course.id)}
                  className="shrink-0 text-[--color-text-muted] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {availableToAdd.length > 0 && (
          <div className="flex gap-2 border-t border-[--color-border] pt-4">
            <select
              value={addCourseId}
              onChange={(e) => setAddCourseId(e.target.value)}
              className="flex-1 rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
            >
              <option value="">Select a course to add…</option>
              {availableToAdd.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <Button size="sm" onClick={addCourse} disabled={!addCourseId} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        )}

        {availableToAdd.length === 0 && courses.length > 0 && (
          <p className="mt-4 text-xs text-[--color-text-muted] border-t border-[--color-border] pt-4">
            All your published courses are already in this path.
          </p>
        )}

        {myCourses.length === 0 && (
          <p className="mt-4 text-xs text-[--color-text-muted]">
            You have no published courses yet.{" "}
            <Link href="/instructor/courses" className="text-[--color-primary] hover:underline">Go create one.</Link>
          </p>
        )}
      </div>
    </div>
  );
}
