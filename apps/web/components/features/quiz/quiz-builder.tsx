"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { QuizQuestion } from "@/types";

interface Props {
  lessonId: string;
  token: string;
}

interface QuizQuestionInstructor extends QuizQuestion {
  correct_index: number;
}

const EMPTY_FORM = {
  question_text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
};

export function QuizBuilder({ lessonId, token }: Props) {
  const [questions, setQuestions] = useState<QuizQuestionInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<QuizQuestionInstructor[]>(`/api/v1/lessons/${lessonId}/quiz/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((qs) => { if (!cancelled) setQuestions(qs); })
      .catch(() => { if (!cancelled) toast.error("Failed to load questions."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lessonId, token]);

  function startEdit(q: QuizQuestionInstructor) {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      options: [...q.options, ...Array(4 - q.options.length).fill("")].slice(0, 4),
      correct_index: q.correct_index,
      explanation: q.explanation ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveQuestion() {
    const opts = form.options.filter((o) => o.trim());
    if (!form.question_text.trim() || opts.length < 2) {
      toast.error("Need a question and at least 2 options.");
      return;
    }
    if (form.correct_index >= opts.length) {
      toast.error("Correct answer must be one of the filled options.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        question_text: form.question_text.trim(),
        options: opts,
        correct_index: form.correct_index,
        explanation: form.explanation.trim() || null,
        position: editingId
          ? (questions.find((q) => q.id === editingId)?.position ?? 0)
          : questions.length,
      };

      if (editingId) {
        const updated = await apiFetch<QuizQuestionInstructor>(`/api/v1/quiz/questions/${editingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? updated : q)));
        toast.success("Question updated.");
      } else {
        const created = await apiFetch<QuizQuestionInstructor>(`/api/v1/lessons/${lessonId}/quiz/questions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setQuestions((prev) => [...prev, created]);
        toast.success("Question added.");
      }
      cancelEdit();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(id: string) {
    try {
      await apiFetch(`/api/v1/quiz/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted.");
    } catch {
      toast.error("Failed to delete question.");
    }
  }

  async function moveQuestion(id: string, direction: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const reordered = [...questions];
    const a = reordered[idx];
    const b = reordered[targetIdx];
    if (!a || !b) return;
    reordered[idx] = b;
    reordered[targetIdx] = a;

    setQuestions(reordered);

    await Promise.all([
      apiFetch(`/api/v1/quiz/questions/${b.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ position: idx }),
      }),
      apiFetch(`/api/v1/quiz/questions/${a.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ position: targetIdx }),
      }),
    ]).catch(() => toast.error("Failed to reorder."));
  }

  if (loading) {
    return (
      <div className="mt-3 space-y-2 px-4 pb-4">
        {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-[--color-border]" />)}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-[--color-border] bg-[--color-surface] px-4 py-4">
      <p className="mb-3 text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
        Quiz Questions ({questions.length})
      </p>

      {/* Existing questions */}
      {questions.length > 0 && (
        <div className="mb-4 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-[--radius-sm] border border-[--color-border] bg-white">
              {editingId === q.id ? (
                <QuestionForm
                  form={form}
                  setForm={setForm}
                  onSave={saveQuestion}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div className="flex items-start gap-2 px-3 py-2">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveQuestion(q.id, -1)}
                      disabled={i === 0}
                      className="p-0.5 text-[--color-text-muted] hover:text-[--color-text-primary] disabled:opacity-20"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveQuestion(q.id, 1)}
                      disabled={i === questions.length - 1}
                      className="p-0.5 text-[--color-text-muted] hover:text-[--color-text-primary] disabled:opacity-20"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[--color-text-primary] leading-snug">
                      <span className="text-[--color-text-muted] mr-1">{i + 1}.</span>
                      {q.question_text}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {q.options.map((opt, oi) => (
                        <span
                          key={oi}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                            oi === q.correct_index
                              ? "bg-green-100 text-green-700 font-medium"
                              : "bg-[--color-surface] text-[--color-text-muted]"
                          }`}
                        >
                          {oi === q.correct_index && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(q)}
                      className="rounded px-2 py-1 text-[10px] text-[--color-text-muted] hover:text-[--color-primary] hover:bg-[--color-primary]/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-1 text-[--color-text-muted] hover:text-[--color-error]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new question */}
      {!editingId && (
        <div className="rounded-[--radius-sm] border border-dashed border-[--color-border] bg-white">
          <QuestionForm
            form={form}
            setForm={setForm}
            onSave={saveQuestion}
            onCancel={null}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}

function QuestionForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  onSave: () => void;
  onCancel: (() => void) | null;
  saving: boolean;
}) {
  return (
    <div className="p-3 space-y-3">
      <textarea
        rows={2}
        placeholder="Question text…"
        value={form.question_text}
        onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
        className="w-full resize-none rounded border border-[--color-border] bg-[--color-surface] px-2.5 py-1.5 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
      />

      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide">Options (select correct)</p>
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, correct_index: i }))}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                form.correct_index === i
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-[--color-border] text-[--color-text-muted] hover:border-[--color-primary]"
              }`}
              title="Mark as correct"
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              value={opt}
              onChange={(e) => setForm((f) => {
                const opts = [...f.options];
                opts[i] = e.target.value;
                return { ...f, options: opts };
              })}
              placeholder={`Option ${String.fromCharCode(65 + i)}${i < 2 ? " (required)" : " (optional)"}`}
              className="flex-1 rounded border border-[--color-border] bg-[--color-surface] px-2 py-1 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            />
          </div>
        ))}
      </div>

      <input
        value={form.explanation}
        onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
        placeholder="Explanation (optional) — shown after answer"
        className="w-full rounded border border-[--color-border] bg-[--color-surface] px-2.5 py-1.5 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 rounded bg-[--color-primary] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[--color-primary-hover] disabled:opacity-50 transition-colors"
        >
          <Plus className="h-3 w-3" />
          {saving ? "Saving…" : onCancel ? "Update" : "Add question"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-xs text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
