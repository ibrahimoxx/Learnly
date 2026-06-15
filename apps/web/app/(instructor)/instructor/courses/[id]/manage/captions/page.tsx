"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Section, Lesson } from "@/types";

interface SectionWithLessons extends Section {
  lessons: Lesson[];
}

export default function CourseCaptionsPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionWithLessons[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const sectionsData = await apiFetch<Section[]>(`/api/v1/courses/${id}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
          lessons: (lessonsPerSection[i] ?? []).filter((l) => l.type === "video"),
        }))
      );
    } catch {
      toast.error("Failed to load curriculum.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function uploadCaptions(sectionId: string, lesson: Lesson, file: File) {
    const token = await getToken();
    setUploadingId(lesson.id);
    try {
      const { upload_url, key } = await apiFetch<{ upload_url: string; key: string }>(
        `/api/v1/sections/${sectionId}/lessons/${lesson.id}/captions-upload-url`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const putResponse = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "text/plain" },
      });
      if (!putResponse.ok) throw new Error("upload failed");

      await apiFetch<Lesson>(`/api/v1/sections/${sectionId}/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ captions_url: key }),
      });

      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: s.lessons.map((l) => (l.id === lesson.id ? { ...l, captions_url: key } : l)) }
            : s
        )
      );
      toast.success("Captions uploaded.");
    } catch {
      toast.error("Failed to upload captions.");
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  const videoLessons = sections.flatMap((s) => s.lessons.map((l) => ({ section: s, lesson: l })));

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Captions</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Upload an .srt subtitle file for each video lecture.
        </p>

        {videoLessons.length === 0 ? (
          <div className="mt-4 rounded-[--radius-md] border border-dashed border-[--color-border] py-10 text-center">
            <p className="text-sm text-[--color-text-muted]">
              No video lectures yet. Add video lessons in the curriculum first.
            </p>
            <Link href={`/instructor/courses/${id}/edit`} className="mt-3 inline-block">
              <Button variant="outline" size="sm">Go to curriculum</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {videoLessons.map(({ section, lesson }) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[--color-text-primary]">{lesson.title}</p>
                  <p className="text-xs text-[--color-text-muted]">{section.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {lesson.captions_url && (
                    <span className="flex items-center gap-1 text-xs text-[--color-success]">
                      <CheckCircle2 className="h-4 w-4" /> Captioned
                    </span>
                  )}
                  <input
                    ref={(el) => { fileInputs.current[lesson.id] = el; }}
                    type="file"
                    accept=".srt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCaptions(section.id, lesson, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={uploadingId === lesson.id}
                    onClick={() => fileInputs.current[lesson.id]?.click()}
                  >
                    {uploadingId === lesson.id ? (
                      "Uploading…"
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {lesson.captions_url ? "Replace" : "Upload"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/goals`}>
          <Button variant="outline" size="sm">Back: Goals</Button>
        </Link>
        <Link href={`/instructor/courses/${id}/manage/accessibility`}>
          <Button size="sm" className="gap-1">
            <FileText className="h-4 w-4" /> Next: Accessibility
          </Button>
        </Link>
      </div>
    </div>
  );
}
