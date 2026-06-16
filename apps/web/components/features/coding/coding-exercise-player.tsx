"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, XCircle, Play, ChevronDown, ChevronUp, Clock, MemoryStick } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CodingExercise, CodeSubmission, TestCaseResult } from "@/types";

const BRAND = "#0056d2";
const TXT = "#1c1d1f";
const TXT2 = "#3d4244";
const TXT3 = "#6a6f73";
const LINE = "#d1d7dc";
const SURFACE = "#f7f9fa";
const GREEN = "#16a34a";
const RED = "#dc2626";

/* Editor panel keeps dark — standard IDE convention */
const ED_BG = "#1e1e1e";
const ED_BG2 = "#252526";
const ED_LINE = "rgba(255,255,255,0.1)";

const LANGUAGES: Record<number, { name: string; monaco: string }> = {
  71: { name: "Python", monaco: "python" },
  63: { name: "JavaScript", monaco: "javascript" },
  54: { name: "C++", monaco: "cpp" },
  62: { name: "Java", monaco: "java" },
};

interface Props {
  lessonId: string;
  token: string;
  onComplete?: () => void;
}

export function CodingExercisePlayer({ lessonId, token: _serverToken, onComplete }: Props) {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => (await getToken()) ?? _serverToken, [getToken, _serverToken]);
  const [exercise, setExercise] = useState<CodingExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [languageId, setLanguageId] = useState(71);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CodeSubmission | null>(null);
  const [showStatement, setShowStatement] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setResult(null);
    getAuthToken().then((tok) =>
      apiFetch<CodingExercise>(`/api/v1/lessons/${lessonId}/exercise`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
    )
      .then((ex) => {
        setExercise(ex);
        setCode(ex.starter_code || "");
        setLanguageId(ex.language_id);
      })
      .catch(() => setError("Failed to load exercise"))
      .finally(() => setLoading(false));
  }, [lessonId, getAuthToken]);

  async function handleSubmit() {
    if (!exercise) return;
    setSubmitting(true);
    setError(null);
    try {
      const tok = await getAuthToken();
      const sub = await apiFetch<CodeSubmission>(
        `/api/v1/lessons/${lessonId}/exercise/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
          body: JSON.stringify({ source_code: code, language_id: languageId }),
        }
      );
      setResult(sub);
      if (sub.status === "accepted") onComplete?.();
    } catch {
      setError("Submission failed. Check that the code execution service is running.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: BRAND, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if ((error && !exercise) || !exercise) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: SURFACE, border: `1px solid ${LINE}` }}
        >
          <Play className="h-7 w-7" style={{ color: TXT3 }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: TXT }}>Exercise coming soon</p>
          <p className="mt-1 text-xs" style={{ color: TXT3 }}>This coding exercise hasn&apos;t been published yet.</p>
        </div>
      </div>
    );
  }

  const verdictColor =
    result?.status === "accepted" ? GREEN
    : result?.status === "wrong_answer" ? RED
    : "#f59e0b";

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {/* Left: problem statement — light theme */}
      <div
        className="flex flex-col overflow-hidden lg:w-[40%]"
        style={{ borderRight: `1px solid ${LINE}`, background: "#fff" }}
      >
        <button
          onClick={() => setShowStatement((v) => !v)}
          className="flex shrink-0 items-center justify-between px-4 py-3 text-xs font-semibold transition-colors lg:hidden"
          style={{ color: TXT2, borderBottom: `1px solid ${LINE}` }}
        >
          Problem Statement
          {showStatement ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className={`${showStatement ? "flex" : "hidden"} lg:flex flex-1 flex-col overflow-y-auto p-5`}>
          <h2 className="mb-4 text-base font-bold" style={{ color: TXT }}>
            {exercise.problem_statement.split("\n")[0]}
          </h2>
          <div className="space-y-2 text-sm" style={{ color: TXT2 }}>
            {exercise.problem_statement.split("\n").slice(1).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {exercise.test_cases && exercise.test_cases.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: TXT3 }}>
                Examples
              </h3>
              <div className="space-y-3">
                {exercise.test_cases.slice(0, 2).map((tc, i) => (
                  <div key={i} className="rounded p-3 text-xs" style={{ border: `1px solid ${LINE}`, background: SURFACE }}>
                    <p style={{ color: TXT3 }}>Input:</p>
                    <pre className="mt-1 font-mono" style={{ color: TXT }}>{tc.input || "(empty)"}</pre>
                    <p className="mt-2" style={{ color: TXT3 }}>Expected output:</p>
                    <pre className="mt-1 font-mono" style={{ color: TXT }}>{tc.expected_output}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: editor + results — intentionally dark (IDE convention) */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: ED_BG }}>
        {/* Editor toolbar */}
        <div
          className="flex shrink-0 items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${ED_LINE}`, background: ED_BG2 }}
        >
          {/* Language badge — locked to exercise language, not user-selectable */}
          <span
            className="rounded px-2.5 py-1.5 text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
          >
            {LANGUAGES[languageId]?.name ?? "Code"}
          </span>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{ background: BRAND, color: "#fff" }}
          >
            <Play className="h-3.5 w-3.5" />
            {submitting ? "Running…" : "Run & Submit"}
          </button>
        </div>

        {/* Code editor */}
        <div className="flex-1 overflow-hidden">
          <textarea
            className="h-full w-full resize-none p-3 font-mono text-sm focus:outline-none"
            placeholder={`// Write your ${LANGUAGES[languageId]?.name ?? "code"} solution here…`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            style={{ background: ED_BG, color: "rgba(255,255,255,0.9)", caretColor: "#fff" }}
          />
        </div>

        {/* Results panel */}
        {(result || error) && (
          <div
            className="shrink-0 max-h-56 overflow-y-auto p-3"
            style={{ borderTop: `1px solid ${ED_LINE}`, background: ED_BG2 }}
          >
            {error && !result && (
              <p className="text-xs" style={{ color: RED }}>{error}</p>
            )}
            {result && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: verdictColor }}>
                    {result.status === "accepted"
                      ? "All tests passed"
                      : result.status === "wrong_answer"
                      ? "Wrong answer"
                      : result.status}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {result.tests_passed}/{result.tests_total} tests passed
                  </span>
                </div>
                <div className="space-y-2">
                  {result.results.map((r: TestCaseResult) => (
                    <TestResult key={r.index} result={r} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TestResult({ result }: { result: TestCaseResult }) {
  const [open, setOpen] = useState(!result.passed);
  const GREEN = "#16a34a";
  const RED = "#dc2626";
  const ED_LINE = "rgba(255,255,255,0.1)";

  return (
    <div className="rounded text-xs" style={{ border: `1px solid ${ED_LINE}`, background: "rgba(255,255,255,0.04)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        {result.passed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: GREEN }} />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" style={{ color: RED }} />
        )}
        <span style={{ color: result.passed ? GREEN : RED }}>
          Test {result.index + 1} — {result.passed ? "Passed" : "Failed"}
        </span>
        <span className="ml-auto flex items-center gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          {result.time_ms != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{result.time_ms}ms
            </span>
          )}
          {result.memory_kb != null && (
            <span className="flex items-center gap-1">
              <MemoryStick className="h-3 w-3" />{result.memory_kb}kb
            </span>
          )}
        </span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
          : <ChevronDown className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
        }
      </button>
      {open && (
        <div className="space-y-2 px-3 py-2" style={{ borderTop: `1px solid ${ED_LINE}` }}>
          {result.stdout && (
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>Your output:</p>
              <pre className="mt-1 font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>{result.stdout.trim()}</pre>
            </div>
          )}
          {!result.passed && (
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>Expected:</p>
              <pre className="mt-1 font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>{result.expected.trim()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
