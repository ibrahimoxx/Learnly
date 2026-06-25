"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { QuizQuestion, QuizAttemptRead } from "@/types";

const BRAND = "#0056d2";
const TXT = "#1c1d1f";
const TXT2 = "#3d4244";
const TXT3 = "#6a6f73";
const LINE = "#d1d7dc";
const SURFACE = "#f7f9fa";
const GREEN = "#16a34a";
const RED = "#dc2626";

interface Props {
  lessonId: string;
  token: string;
  onComplete?: () => void;
}

export function QuizPlayer({ lessonId, token: _serverToken, onComplete }: Props) {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => (await getToken()) ?? _serverToken, [getToken, _serverToken]);
  const posthog = usePostHog();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempt, setAttempt] = useState<QuizAttemptRead | null>(null);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const tok = await getAuthToken();
        const [qs, att] = await Promise.allSettled([
          apiFetch<QuizQuestion[]>(`/api/v1/lessons/${lessonId}/quiz/questions`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          apiFetch<QuizAttemptRead>(`/api/v1/lessons/${lessonId}/quiz/my-attempt`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
        ]);

        if (cancelled) return;

        const loadedQs = qs.status === "fulfilled" ? qs.value : [];
        setQuestions(loadedQs);
        setSelected(new Array(loadedQs.length).fill(null));

        if (att.status === "fulfilled") {
          setAttempt(att.value);
        }
      } catch {
        if (!cancelled) setError("Failed to load quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lessonId, getAuthToken]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const tok = await getAuthToken();
      const result = await apiFetch<QuizAttemptRead>(`/api/v1/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ answers: selected }),
      });
      posthog?.capture("quiz_submitted", {
        lesson_id: lessonId,
        score: result.score,
        total: result.total,
        passed: result.passed,
        attempt_number: result.attempt_number,
      });
      setAttempt(result);
      if (result.passed) onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAttempt(null);
    setSelected(new Array(questions.length).fill(null));
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg" style={{ background: LINE }} />
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <HelpCircle className="mx-auto h-12 w-12 mb-3" style={{ color: TXT3 }} />
          <p className="text-sm" style={{ color: TXT3 }}>No questions yet for this quiz.</p>
        </div>
      </div>
    );
  }

  if (attempt) {
    return <QuizResults attempt={attempt} questions={questions} onRetry={retry} />;
  }

  const allAnswered = selected.every((s) => s !== null);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <HelpCircle className="h-5 w-5" style={{ color: BRAND }} />
          <h2 className="text-lg font-bold" style={{ color: TXT }}>Quiz</h2>
          <span className="text-sm" style={{ color: TXT3 }}>
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div
              key={q.id}
              className="rounded-lg p-5"
              style={{ border: `1px solid ${LINE}`, background: "#ffffff" }}
            >
              <p className="text-sm font-medium leading-snug mb-4" style={{ color: TXT }}>
                <span className="mr-2" style={{ color: TXT3 }}>{qi + 1}.</span>
                {q.question_text}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = selected[qi] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() =>
                        setSelected((prev) => prev.map((v, i) => (i === qi ? oi : v)))
                      }
                      className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-sm transition-colors"
                      style={{
                        border: `1px solid ${isSelected ? BRAND : LINE}`,
                        background: isSelected ? "#eaf1fb" : SURFACE,
                        color: isSelected ? BRAND : TXT2,
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          border: `1px solid ${isSelected ? BRAND : LINE}`,
                          background: isSelected ? BRAND : "transparent",
                          color: isSelected ? "#fff" : TXT3,
                        }}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm" style={{ color: RED }}>{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <span className="text-xs" style={{ color: TXT3 }}>
            {selected.filter((s) => s !== null).length}/{questions.length} answered
          </span>
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="rounded-md px-6 py-2 text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: BRAND, color: "#fff" }}
          >
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizResults({
  attempt,
  questions,
  onRetry,
}: {
  attempt: QuizAttemptRead;
  questions: QuizQuestion[];
  onRetry: () => void;
}) {
  const pct = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const passed = attempt.passed;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        {/* Score card */}
        <div
          className="mb-8 rounded-xl p-6 text-center"
          style={{
            border: `1px solid ${passed ? "#bbf7d0" : "#fecaca"}`,
            background: passed ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <Trophy className="mx-auto mb-3 h-10 w-10" style={{ color: passed ? GREEN : RED }} />
          <p className="text-4xl font-bold" style={{ color: TXT }}>{pct}%</p>
          <p className="mt-1 text-sm" style={{ color: TXT3 }}>
            {attempt.score} / {attempt.total} correct
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: passed ? "#dcfce7" : "#fee2e2",
                color: passed ? GREEN : RED,
              }}
            >
              {passed ? "Passed" : "Try again — need 70% to pass"}
            </span>
            <span className="text-xs" style={{ color: TXT3 }}>Attempt {attempt.attempt_number}</span>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-4">
          {attempt.results.map((r, i) => {
            const q = questions[i];
            return (
              <div
                key={r.question_id}
                className="rounded-lg p-4"
                style={{
                  border: `1px solid ${r.is_correct ? "#bbf7d0" : "#fecaca"}`,
                  background: r.is_correct ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <div className="flex items-start gap-2">
                  {r.is_correct ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GREEN }} />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: RED }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: TXT }}>
                      <span className="mr-1" style={{ color: TXT3 }}>{i + 1}.</span>
                      {q?.question_text}
                    </p>
                    <div className="mt-2 space-y-1">
                      {q?.options.map((opt, oi) => {
                        const isCorrect = oi === r.correct_index;
                        const isWrong = oi === r.selected_index && !isCorrect;
                        return (
                          <div
                            key={oi}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-xs"
                            style={{
                              background: isCorrect ? "#dcfce7" : isWrong ? "#fee2e2" : "transparent",
                              color: isCorrect ? GREEN : isWrong ? RED : TXT3,
                              textDecoration: isWrong ? "line-through" : "none",
                            }}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                            {isCorrect && <span className="ml-auto" style={{ color: GREEN }}>✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                    {r.explanation && (
                      <p className="mt-2 text-xs italic" style={{ color: TXT3 }}>{r.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
            style={{ border: `1px solid ${LINE}`, color: TXT2, background: "#fff" }}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
