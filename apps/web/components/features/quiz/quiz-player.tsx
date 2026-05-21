"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { QuizQuestion, QuizAttemptRead } from "@/types";

interface Props {
  lessonId: string;
  token: string;
}

export function QuizPlayer({ lessonId, token }: Props) {
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
        const [qs, att] = await Promise.allSettled([
          apiFetch<QuizQuestion[]>(`/api/v1/lessons/${lessonId}/quiz/questions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<QuizAttemptRead>(`/api/v1/lessons/${lessonId}/quiz/my-attempt`, {
            headers: { Authorization: `Bearer ${token}` },
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
  }, [lessonId, token]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<QuizAttemptRead>(`/api/v1/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
            <div key={i} className="h-24 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white/40">
          <HelpCircle className="mx-auto h-12 w-12 mb-3" />
          <p className="text-sm">No questions yet for this quiz.</p>
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
          <HelpCircle className="h-5 w-5 text-[--color-primary]" />
          <h2 className="text-lg font-bold text-white">Quiz</h2>
          <span className="text-sm text-white/40">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-white leading-snug mb-4">
                <span className="text-white/40 mr-2">{qi + 1}.</span>
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
                      className={`flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "border-[--color-primary] bg-[--color-primary]/15 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        isSelected ? "border-[--color-primary] bg-[--color-primary] text-white" : "border-white/20 text-white/40"
                      }`}>
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

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <span className="text-xs text-white/40">
            {selected.filter((s) => s !== null).length}/{questions.length} answered
          </span>
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="rounded-md bg-[--color-primary] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[--color-primary-hover] disabled:opacity-40 disabled:cursor-not-allowed"
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

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        {/* Score card */}
        <div className={`mb-8 rounded-xl border p-6 text-center ${
          attempt.passed
            ? "border-green-500/30 bg-green-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}>
          <Trophy className={`mx-auto mb-3 h-10 w-10 ${attempt.passed ? "text-green-400" : "text-red-400"}`} />
          <p className="text-4xl font-bold text-white">{pct}%</p>
          <p className="mt-1 text-sm text-white/60">
            {attempt.score} / {attempt.total} correct
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              attempt.passed ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}>
              {attempt.passed ? "Passed" : "Try again — need 70% to pass"}
            </span>
            <span className="text-xs text-white/30">Attempt {attempt.attempt_number}</span>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-4">
          {attempt.results.map((r, i) => {
            const q = questions[i];
            return (
              <div
                key={r.question_id}
                className={`rounded-lg border p-4 ${
                  r.is_correct ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {r.is_correct ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug">
                      <span className="text-white/40 mr-1">{i + 1}.</span>
                      {q?.question_text}
                    </p>
                    <div className="mt-2 space-y-1">
                      {q?.options.map((opt, oi) => {
                        const isCorrect = oi === r.correct_index;
                        const isSelected = oi === r.selected_index;
                        return (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs ${
                              isCorrect
                                ? "bg-green-500/15 text-green-300"
                                : isSelected && !isCorrect
                                ? "bg-red-500/15 text-red-300 line-through"
                                : "text-white/40"
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                            {isCorrect && <span className="ml-auto text-green-400">✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                    {r.explanation && (
                      <p className="mt-2 text-xs text-white/50 italic">{r.explanation}</p>
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
            className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
