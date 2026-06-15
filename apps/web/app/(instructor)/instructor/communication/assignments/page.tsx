"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { AssignmentSubmissionWithContext } from "@/types";

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function GradeForm({
  submission,
  onGraded,
}: {
  submission: AssignmentSubmissionWithContext;
  onGraded: (updated: AssignmentSubmissionWithContext) => void;
}) {
  const { getToken } = useAuth();
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitGrade() {
    const gradeValue = Number(grade);
    if (!grade.trim() || Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100 || !feedback.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      const updated = await apiFetch<AssignmentSubmissionWithContext>(
        `/api/v1/instructor/assignments/${submission.id}/grade`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ grade: gradeValue, feedback: feedback.trim() }),
        }
      );
      onGraded({ ...updated, student_name: submission.student_name, student_email: submission.student_email, lesson_title: submission.lesson_title, course_title: submission.course_title });
      toast.success("Submission graded.");
    } catch {
      toast.error("Failed to save grade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-[--color-border] pt-3">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Grade (0-100)"
          className="w-32"
        />
        <span className="text-sm text-[--color-text-muted]">/ 100</span>
      </div>
      <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Feedback for the student..." />
      <div className="flex justify-end">
        <Button onClick={submitGrade} disabled={saving || !grade.trim() || !feedback.trim()}>
          {saving ? "Saving..." : "Submit grade"}
        </Button>
      </div>
    </div>
  );
}

export default function InstructorAssignmentsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionWithContext[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<AssignmentSubmissionWithContext[]>("/api/v1/instructor/assignments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setSubmissions(data);
      } catch {
        if (!cancelled) toast.error("Failed to load assignment submissions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGraded(updated: AssignmentSubmissionWithContext) {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (submissions.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-[--color-text-muted]" />
        <h2 className="mt-2 font-semibold text-[--color-text-primary]">No submissions yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Student assignment submissions for your courses will appear here.
        </p>
        <Link
          href="/instructor/courses"
          className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to My Courses
        </Link>
      </div>
    );
  }

  const pending = submissions.filter((s) => s.status === "submitted");
  const reviewed = submissions.filter((s) => s.status === "reviewed");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold text-[--color-text-primary]">
          Awaiting review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="premium-card mt-3 rounded-[--radius-lg] p-6 text-center text-sm text-[--color-text-muted]">
            Nothing waiting for review — nice work.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {pending.map((s) => (
              <div key={s.id} className="premium-card rounded-[--radius-lg] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[--color-text-primary]">{s.student_name}</p>
                    <p className="text-xs text-[--color-text-muted]">{s.course_title} · {s.lesson_title}</p>
                  </div>
                  <span className="text-xs text-[--color-text-muted]">Submitted {formatTime(s.submitted_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] p-3 text-sm text-[--color-text-secondary]">
                  {s.content}
                </p>
                <GradeForm submission={s} onGraded={handleGraded} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-[--color-text-primary]">
          Reviewed ({reviewed.length})
        </h2>
        {reviewed.length === 0 ? (
          <div className="premium-card mt-3 rounded-[--radius-lg] p-6 text-center text-sm text-[--color-text-muted]">
            Graded submissions will appear here.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {reviewed.map((s) => (
              <div key={s.id} className="premium-card rounded-[--radius-lg] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[--color-text-primary]">{s.student_name}</p>
                    <p className="text-xs text-[--color-text-muted]">{s.course_title} · {s.lesson_title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[--color-success]">
                    <CheckCircle2 className="h-4 w-4" />
                    Reviewed {s.reviewed_at ? formatTime(s.reviewed_at) : ""}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] p-3 text-sm text-[--color-text-secondary]">
                  {s.content}
                </p>
                {s.grade !== null && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-[--color-text-primary]">
                    <Star className="h-4 w-4 text-[--color-star]" />
                    Grade: {s.grade}/100
                  </div>
                )}
                {s.feedback && (
                  <p className="mt-1 text-sm text-[--color-text-secondary]">
                    <span className="font-medium text-[--color-text-primary]">Feedback: </span>
                    {s.feedback}
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
