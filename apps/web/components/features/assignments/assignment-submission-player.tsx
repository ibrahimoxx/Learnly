"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, ClipboardList, Send, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AssignmentSubmissionRead } from "@/types";

const BRAND = "#0056d2";
const TXT = "#1c1d1f";
const TXT2 = "#3d4244";
const TXT3 = "#6a6f73";
const LINE = "#d1d7dc";
const SURFACE = "#f7f9fa";
const GREEN = "#16a34a";
const RED = "#dc2626";
const STAR = "#e59819";

interface Props {
  lessonId: string;
  token: string;
}

export function AssignmentSubmissionPlayer({ lessonId, token: _serverToken }: Props) {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => (await getToken()) ?? _serverToken, [getToken, _serverToken]);
  const [submission, setSubmission] = useState<AssignmentSubmissionRead | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const tok = await getAuthToken();
        const existing = await apiFetch<AssignmentSubmissionRead | null>(`/api/v1/lessons/${lessonId}/assignment`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (cancelled) return;
        if (existing) {
          setSubmission(existing);
          setContent(existing.content ?? "");
        }
      } catch {
        if (!cancelled) setError("Failed to load assignment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lessonId, getAuthToken]);

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const tok = await getAuthToken();
      const result = await apiFetch<AssignmentSubmissionRead>(`/api/v1/lessons/${lessonId}/assignment`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setSubmission(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-5 w-48 animate-pulse rounded" style={{ background: LINE }} />
        <div className="h-32 w-full animate-pulse rounded" style={{ background: LINE }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5" style={{ color: BRAND }} />
        <h2 className="text-lg font-semibold" style={{ color: TXT }}>Assignment</h2>
      </div>

      {error && (
        <p
          className="rounded px-3 py-2 text-sm"
          style={{ border: `1px solid #fecaca`, background: "#fef2f2", color: RED }}
        >
          {error}
        </p>
      )}

      {submission?.status === "reviewed" ? (
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 rounded px-3 py-2 text-sm"
            style={{ border: `1px solid #bbf7d0`, background: "#f0fdf4", color: GREEN }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Reviewed by instructor
          </div>
          {submission.grade !== null && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: STAR }} />
              <span className="text-sm font-medium" style={{ color: TXT }}>Grade: {submission.grade}/100</span>
            </div>
          )}
          {submission.feedback && (
            <div className="rounded p-4" style={{ border: `1px solid ${LINE}`, background: SURFACE }}>
              <p className="text-xs font-semibold mb-1" style={{ color: TXT3 }}>Instructor feedback</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: TXT2 }}>{submission.feedback}</p>
            </div>
          )}
          <div className="rounded p-4" style={{ border: `1px solid ${LINE}`, background: SURFACE }}>
            <p className="text-xs font-semibold mb-1" style={{ color: TXT3 }}>Your submission</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: TXT2 }}>{submission.content}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {submission?.status === "submitted" && (
            <p
              className="rounded px-3 py-2 text-sm"
              style={{ border: `1px solid #bdd4f8`, background: "#eaf1fb", color: BRAND }}
            >
              Submitted — awaiting instructor review. You can update your answer below.
            </p>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Write your submission here..."
            className="w-full rounded p-4 text-sm focus:outline-none"
            style={{
              border: `1px solid ${LINE}`,
              background: "#fff",
              color: TXT,
              resize: "vertical",
            }}
          />
          <button
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: BRAND, color: "#fff" }}
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : submission ? "Resubmit" : "Submit assignment"}
          </button>
        </div>
      )}
    </div>
  );
}
