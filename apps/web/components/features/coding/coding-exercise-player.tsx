"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, XCircle, Play, ChevronDown, ChevronUp, Clock, MemoryStick } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CodingExercise, CodeSubmission, TestCaseResult } from "@/types";


const LANGUAGES: Record<number, { name: string; monaco: string }> = {
  71: { name: "Python", monaco: "python" },
  63: { name: "JavaScript", monaco: "javascript" },
  54: { name: "C++", monaco: "cpp" },
  62: { name: "Java", monaco: "java" },
};

interface Props {
  lessonId: string;
  token: string;
}

export function CodingExercisePlayer({ lessonId, token: _serverToken }: Props) {
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
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    } catch {
      setError("Submission failed. Check that the code execution service is running.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--color-primary] border-t-transparent" />
      </div>
    );
  }

  if (error && !exercise) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/50">{error}</div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/50">
        No exercise found for this lesson.
      </div>
    );
  }

  const verdictColor =
    result?.status === "accepted"
      ? "text-green-400"
      : result?.status === "wrong_answer"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {/* Left: problem statement */}
      <div className="flex flex-col overflow-hidden border-b border-white/10 lg:w-[40%] lg:border-b-0 lg:border-r">
        <button
          onClick={() => setShowStatement((v) => !v)}
          className="flex shrink-0 items-center justify-between px-4 py-3 text-xs font-semibold text-white/80 hover:bg-white/5 transition-colors lg:hidden"
        >
          Problem Statement
          {showStatement ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className={`${showStatement ? "flex" : "hidden"} lg:flex flex-1 flex-col overflow-y-auto p-4`}>
          <h2 className="mb-4 text-base font-bold text-white">{exercise.problem_statement.split("\n")[0]}</h2>
          <div className="prose prose-invert prose-sm max-w-none text-white/75">
            {exercise.problem_statement.split("\n").slice(1).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {exercise.test_cases && exercise.test_cases.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                Examples
              </h3>
              <div className="space-y-3">
                {exercise.test_cases.slice(0, 2).map((tc, i) => (
                  <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                    <p className="text-white/40">Input:</p>
                    <pre className="mt-1 font-mono text-white/80">{tc.input || "(empty)"}</pre>
                    <p className="mt-2 text-white/40">Expected output:</p>
                    <pre className="mt-1 font-mono text-white/80">{tc.expected_output}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: editor + results */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Editor toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[oklch(12%_0.03_295)] px-3 py-2">
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-white/20 transition-colors"
            >
              {LANGUAGES[languageId]?.name ?? "Language"}
              <ChevronDown className="h-3 w-3 text-white/50" />
            </button>
            {langOpen && (
              <div className="absolute left-0 top-8 z-50 min-w-30 rounded-md border border-white/15 bg-[oklch(18%_0.03_295)] shadow-xl">
                {Object.entries(LANGUAGES).map(([id, lang]) => (
                  <button
                    key={id}
                    onClick={() => { setLanguageId(Number(id)); setLangOpen(false); }}
                    className={`flex w-full items-center px-3 py-2 text-xs transition-colors hover:bg-white/10 ${Number(id) === languageId ? "text-[--color-primary] font-semibold" : "text-white/80"}`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded bg-[--color-primary] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[--color-primary-hover] transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            {submitting ? "Running…" : "Run & Submit"}
          </button>
        </div>

        {/* Code editor */}
        <div className="flex-1 overflow-hidden">
          <textarea
            className="h-full w-full resize-none bg-[#1e1e1e] p-3 font-mono text-sm text-white/90 focus:outline-none focus:ring-1 focus:ring-[--color-primary]/50"
            placeholder={`// Write your ${LANGUAGES[languageId]?.name ?? "code"} solution here…`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Results panel */}
        {(result || error) && (
          <div className="shrink-0 max-h-56 overflow-y-auto border-t border-white/10 bg-[oklch(10%_0.02_295)] p-3">
            {error && !result && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            {result && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-sm font-bold ${verdictColor}`}>
                    {result.status === "accepted"
                      ? "All tests passed"
                      : result.status === "wrong_answer"
                      ? "Wrong answer"
                      : result.status}
                  </span>
                  <span className="text-xs text-white/40">
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

  return (
    <div className="rounded border border-white/10 bg-white/5 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        {result.passed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
        )}
        <span className={result.passed ? "text-green-300" : "text-red-300"}>
          Test {result.index + 1} — {result.passed ? "Passed" : "Failed"}
        </span>
        <span className="ml-auto flex items-center gap-2 text-white/30">
          {result.time_ms != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {result.time_ms}ms
            </span>
          )}
          {result.memory_kb != null && (
            <span className="flex items-center gap-1">
              <MemoryStick className="h-3 w-3" />
              {result.memory_kb}kb
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
      </button>
      {open && (
        <div className="border-t border-white/10 px-3 py-2 space-y-2">
          {result.stdout && (
            <div>
              <p className="text-white/40">Your output:</p>
              <pre className="mt-1 font-mono text-white/70">{result.stdout.trim()}</pre>
            </div>
          )}
          {!result.passed && (
            <div>
              <p className="text-white/40">Expected:</p>
              <pre className="mt-1 font-mono text-white/70">{result.expected.trim()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
