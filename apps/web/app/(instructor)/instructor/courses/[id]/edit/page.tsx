"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Trash2, GripVertical, Upload, Eye, EyeOff, Tag, X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Course, Section, Lesson } from "@/types";

interface SectionWithLessons extends Section {
  lessons: Lesson[];
  expanded: boolean;
}

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<SectionWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Coupon state
  interface CouponRead {
    id: string; code: string; discount_type: string; discount_value: number;
    max_uses: number | null; uses_count: number; expires_at: string | null; is_active: boolean;
  }
  const [coupons, setCoupons] = useState<CouponRead[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percent" | "fixed">("percent");
  const [couponValue, setCouponValue] = useState("");
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Course title draft
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const [courseData, sectionsData, couponsData] = await Promise.all([
        apiFetch<Course>(`/api/v1/courses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch<Section[]>(`/api/v1/courses/${id}/sections`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch<CouponRead[]>(`/api/v1/coupons`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => [] as CouponRead[]),
      ]);

      setCourse(courseData);
      setDraftTitle(courseData.title);
      setDraftDescription(courseData.description ?? "");
      setCoupons((couponsData as CouponRead[]).filter((c) => c.is_active));

      const lessonsPerSection = await Promise.all(
        sectionsData.map((s) =>
          apiFetch<Lesson[]>(`/api/v1/sections/${s.id}/lessons`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => [] as Lesson[])
        )
      );

      setSections(
        sectionsData.map((s, i) => ({
          ...s,
          lessons: lessonsPerSection[i] ?? [],
          expanded: true,
        }))
      );
    } catch {
      toast.error("Failed to load course.");
      router.push("/instructor/courses");
    } finally {
      setLoading(false);
    }
  }, [id, getToken, router]);

  useEffect(() => { load(); }, [load]);

  async function saveCourseDetails() {
    const token = await getToken();
    setSaving(true);
    try {
      const updated = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: draftTitle, description: draftDescription }),
      });
      setCourse(updated);
      toast.success("Course details saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function publishCourse() {
    const token = await getToken();
    setSaving(true);
    try {
      const updated = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "published" }),
      });
      setCourse(updated);
      toast.success("Course published!");
    } catch {
      toast.error("Failed to publish.");
    } finally {
      setSaving(false);
    }
  }

  async function addSection() {
    const token = await getToken();
    try {
      const section = await apiFetch<Section>(`/api/v1/courses/${id}/sections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "New Section", position: sections.length }),
      });
      setSections((prev) => [...prev, { ...section, lessons: [], expanded: true }]);
    } catch {
      toast.error("Failed to add section.");
    }
  }

  async function deleteSection(sectionId: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/courses/${id}/sections/${sectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      toast.success("Section deleted.");
    } catch {
      toast.error("Failed to delete section.");
    }
  }

  async function updateSectionTitle(sectionId: string, title: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/courses/${id}/sections/${sectionId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
      );
    } catch {
      toast.error("Failed to update section.");
    }
  }

  async function addLesson(sectionId: string) {
    const token = await getToken();
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    try {
      const lesson = await apiFetch<Lesson>(`/api/v1/sections/${sectionId}/lessons`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: "New Lesson",
          position: section.lessons.length,
          type: "video",
          is_free_preview: false,
          duration_seconds: 0,
        }),
      });
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, lessons: [...s.lessons, lesson] } : s
        )
      );
    } catch {
      toast.error("Failed to add lesson.");
    }
  }

  async function deleteLesson(sectionId: string, lessonId: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/sections/${sectionId}/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
            : s
        )
      );
      toast.success("Lesson deleted.");
    } catch {
      toast.error("Failed to delete lesson.");
    }
  }

  async function getUploadUrl(sectionId: string, lessonId: string) {
    const token = await getToken();
    try {
      const { upload_url } = await apiFetch<{ upload_url: string; key: string }>(
        `/api/v1/sections/${sectionId}/lessons/${lessonId}/upload-url`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Upload URL ready — copy it to upload your video.");
      await navigator.clipboard.writeText(upload_url).catch(() => null);
      toast("URL copied to clipboard", { description: upload_url.slice(0, 60) + "…" });
    } catch {
      toast.error("Failed to get upload URL.");
    }
  }

  async function createCoupon() {
    if (!couponCode.trim() || !couponValue) return;
    const token = await getToken();
    setCreatingCoupon(true);
    try {
      const created = await apiFetch<CouponRead>(`/api/v1/coupons`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_id: id,
          code: couponCode.trim().toUpperCase(),
          discount_type: couponType,
          discount_value: couponType === "percent" ? parseInt(couponValue) : Math.round(parseFloat(couponValue) * 100),
          max_uses: couponMaxUses ? parseInt(couponMaxUses) : null,
        }),
      });
      setCoupons((prev) => [created, ...prev]);
      setCouponCode(""); setCouponValue(""); setCouponMaxUses("");
      toast.success(`Coupon ${created.code} created.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg.includes("409") ? "Code already exists" : "Failed to create coupon");
    } finally {
      setCreatingCoupon(false);
    }
  }

  async function deactivateCoupon(code: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/coupons/${code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons((prev) => prev.filter((c) => c.code !== code));
      toast.success("Coupon deactivated.");
    } catch {
      toast.error("Failed to deactivate coupon.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/instructor/courses" className="text-[--color-text-muted] hover:text-[--color-text-primary]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-[--color-text-primary] truncate">{course.title}</h1>
          <Badge variant={course.status === "published" ? "success" : "secondary"}>
            {course.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${course.slug}`} target="_blank">
            <Button variant="outline" size="sm">Preview</Button>
          </Link>
          {course.status !== "published" && (
            <Button size="sm" onClick={publishCourse} disabled={saving}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Course details */}
      <section className="mt-8 rounded-[--radius-md] border border-[--color-border] bg-white p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Course Details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">
              Title
            </label>
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Course title"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">
              Description
            </label>
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={4}
              placeholder="What will students learn?"
              className="w-full rounded-[--radius-sm] border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary] resize-none"
            />
          </div>
          <Button onClick={saveCourseDetails} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Curriculum */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[--color-text-primary]">Curriculum</h2>
          <Button onClick={addSection} variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="mt-4 rounded-[--radius-md] border border-dashed border-[--color-border] bg-white py-10 text-center">
            <p className="text-sm text-[--color-text-muted]">
              No sections yet. Add a section to start building your curriculum.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="rounded-[--radius-md] border border-[--color-border] bg-white overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-2 bg-[--color-surface] px-4 py-3">
                  <GripVertical className="h-4 w-4 text-[--color-text-muted] cursor-grab" />
                  <EditableTitle
                    value={section.title}
                    onSave={(t) => updateSectionTitle(section.id, t)}
                    className="flex-1 font-semibold text-sm text-[--color-text-primary]"
                  />
                  <button
                    onClick={() =>
                      setSections((prev) =>
                        prev.map((s) =>
                          s.id === section.id ? { ...s, expanded: !s.expanded } : s
                        )
                      )
                    }
                    className="p-1 text-[--color-text-muted] hover:text-[--color-text-primary]"
                  >
                    {section.expanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 text-[--color-text-muted] hover:text-[--color-error]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Lessons */}
                {section.expanded && (
                  <div>
                    {section.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-2 border-t border-[--color-border] px-4 py-3"
                      >
                        <GripVertical className="h-4 w-4 text-[--color-text-muted] cursor-grab shrink-0" />
                        <EditableTitle
                          value={lesson.title}
                          onSave={async (t) => {
                            const token = await getToken();
                            await apiFetch(`/api/v1/sections/${section.id}/lessons/${lesson.id}`, {
                              method: "PATCH",
                              headers: { Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ title: t }),
                            }).catch(() => toast.error("Failed to update lesson."));
                            setSections((prev) =>
                              prev.map((s) =>
                                s.id === section.id
                                  ? { ...s, lessons: s.lessons.map((l) => l.id === lesson.id ? { ...l, title: t } : l) }
                                  : s
                              )
                            );
                          }}
                          className="min-w-0 flex-1 text-sm text-[--color-text-secondary]"
                        />
                        <Badge variant="outline" className="shrink-0">{lesson.type}</Badge>
                        {lesson.type === "video" && (
                          <button
                            onClick={() => getUploadUrl(section.id, lesson.id)}
                            className="flex items-center gap-1 rounded-sm border border-[--color-border] px-2 py-1 text-xs text-[--color-text-muted] hover:border-[--color-primary] hover:text-[--color-primary] transition-colors shrink-0"
                          >
                            <Upload className="h-3 w-3" /> Upload
                          </button>
                        )}
                        <button
                          onClick={() => deleteLesson(section.id, lesson.id)}
                          className="shrink-0 p-1 text-[--color-text-muted] hover:text-[--color-error]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add lesson */}
                    <div className="border-t border-[--color-border] px-4 py-2">
                      <button
                        onClick={() => addLesson(section.id)}
                        className="flex items-center gap-1 text-xs font-medium text-[--color-primary] hover:underline"
                      >
                        <Plus className="h-3 w-3" /> Add lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EditableTitle({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft.trim() && draft !== value) onSave(draft.trim());
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        className="flex-1 rounded border border-[--color-primary] bg-white px-2 py-0.5 text-sm focus:outline-none"
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:text-[--color-primary] transition-colors ${className ?? ""}`}
      onClick={() => { setEditing(true); setDraft(value); }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}
