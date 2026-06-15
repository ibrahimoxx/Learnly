"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, ClipboardList, Send, Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AssignmentSubmissionRead } from "@/types";

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
        <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-32 w-full animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-[var(--color-primary)]" />
        <h2 className="text-lg font-semibold text-white">Assignment</h2>
      </div>

      {error && (
        <p className="rounded-sm border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      {submission?.status === "reviewed" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-sm border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]">
            <CheckCircle2 className="h-4 w-4" />
            Reviewed by instructor
          </div>
          {submission.grade !== null && (
            <div className="flex items-center gap-2 text-white">
              <Star className="h-4 w-4 text-[var(--color-star)]" />
              <span className="text-sm font-medium">Grade: {submission.grade}/100</span>
            </div>
          )}
          {submission.feedback && (
            <div className="rounded-sm border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-white/50 mb-1">Instructor feedback</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}
          <div className="rounded-sm border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-white/50 mb-1">Your submission</p>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{submission.content}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {submission?.status === "submitted" && (
            <p className="rounded-sm border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-white/80">
              Submitted — awaiting instructor review. You can update your answer below.
            </p>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Write your submission here..."
            className="w-full rounded-sm border border-white/15 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-primary)] focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 rounded-sm bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : submission ? "Resubmit" : "Submit assignment"}
          </button>
        </div>
      )}
    </div>
  );
}
