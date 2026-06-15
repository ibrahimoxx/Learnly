"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

export default function CourseAccessibilityPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [altText, setAltText] = useState("");

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const courseData = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourse(courseData);
      setAltText(courseData.image_alt_text ?? "");
    } catch {
      toast.error("Failed to load course.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const token = await getToken();
    setSaving(true);
    try {
      await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_alt_text: altText.trim() || null }),
      });
      toast.success("Accessibility settings saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Course Image Accessibility</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Add descriptive alt text for your course thumbnail so screen readers can describe it.
        </p>

        {course?.image_url && (
          <div className="mt-4 overflow-hidden rounded-[--radius-md] border border-[--color-border]">
            <Image
              src={course.image_url}
              alt={altText || "Course thumbnail preview"}
              width={400}
              height={225}
              className="h-auto w-full max-w-sm object-cover"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">
            Alt text
          </label>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="e.g. Instructor coding on a laptop with the course title overlay"
            maxLength={500}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/captions`}>
          <Button variant="outline" size="sm">Back: Captions</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/instructor/courses/${id}/manage/pricing`}>
            <Button variant="outline" size="sm">Next: Pricing</Button>
          </Link>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
