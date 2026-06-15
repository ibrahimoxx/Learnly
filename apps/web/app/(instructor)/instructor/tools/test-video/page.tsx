"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle2, Clock, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { TestVideoRequestRead, TestVideoUploadResponse } from "@/types";

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InstructorTestVideoPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TestVideoRequestRead[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<TestVideoRequestRead[]>("/api/v1/instructor/tools/test-video", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setRequests(data);
      } catch {
        if (!cancelled) toast.error("Failed to load test video requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(file: File) {
    setUploading(true);
    try {
      const token = await getToken();
      const { upload_url, video_key } = await apiFetch<TestVideoUploadResponse>(
        "/api/v1/instructor/tools/test-video/upload-url",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ filename: file.name }),
        }
      );

      const putResponse = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!putResponse.ok) throw new Error("upload failed");

      const created = await apiFetch<TestVideoRequestRead>("/api/v1/instructor/tools/test-video", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ video_key, note: note.trim() || undefined }),
      });
      setRequests((prev) => [created, ...prev]);
      setNote("");
      toast.success("Video submitted for review.");
    } catch {
      toast.error("Failed to upload video.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-[--color-text-primary]">
          <Video className="h-4 w-4 text-[--color-primary]" />
          Get expert feedback on your video
        </h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Upload a sample lecture and our team will review your lighting, audio, and framing.
        </p>

        <div className="mt-4 space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything specific you'd like feedback on? (optional)"
          />
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload video"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-[--color-text-primary]">Your submissions</h2>
        {requests.length === 0 ? (
          <div className="premium-card mt-3 rounded-[--radius-lg] p-10 text-center">
            <Video className="mx-auto h-10 w-10 text-[--color-text-muted]" />
            <p className="mt-2 font-semibold text-[--color-text-primary]">No submissions yet</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Upload a video above to request feedback from our team.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="premium-card rounded-[--radius-lg] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={r.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-[--color-primary] hover:underline"
                  >
                    View uploaded video
                  </a>
                  {r.status === "reviewed" ? (
                    <span className="flex items-center gap-1 text-xs text-[--color-success]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Reviewed {r.reviewed_at ? formatTime(r.reviewed_at) : ""}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[--color-text-muted]">
                      <Clock className="h-3.5 w-3.5" />
                      Pending review
                    </span>
                  )}
                </div>
                {r.note && <p className="mt-2 text-sm text-[--color-text-secondary]">{r.note}</p>}
                {r.feedback ? (
                  <div className="mt-3 rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] p-3 text-sm text-[--color-text-secondary]">
                    <p className="mb-1 text-xs font-semibold text-[--color-text-muted]">Feedback</p>
                    {r.feedback}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[--color-text-muted]">
                    Submitted {formatTime(r.created_at)} — we&apos;ll notify you once feedback is ready.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
