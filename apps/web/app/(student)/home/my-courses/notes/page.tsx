"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { StickyNote, Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { NoteWithContext } from "@/types";

function formatTimestamp(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NotesPage() {
  const { getToken } = useAuth();
  const [notes, setNotes] = useState<NoteWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<NoteWithContext[]>("/api/v1/notes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(data);
      } catch {
        setNotes([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    notes.forEach((n) => map.set(n.course_id, n.course_title));
    return Array.from(map.entries());
  }, [notes]);

  const filtered = courseFilter === "all" ? notes : notes.filter((n) => n.course_id === courseFilter);

  async function saveEdit(noteId: string) {
    if (!editText.trim()) return;
    const token = await getToken();
    try {
      const updated = await apiFetch<NoteWithContext>(`/api/v1/notes/${noteId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, content: updated.content, updated_at: updated.updated_at } : n))
      );
      setEditingId(null);
    } catch {
      toast.error("Failed to update note. Please try again.");
    }
  }

  async function deleteNote(noteId: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      toast.error("Failed to delete note. Please try again.");
    }
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Student studio
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary] sm:text-5xl">My Notes</h1>
        <p className="mt-2 text-sm text-[--color-text-secondary]">All notes you&apos;ve taken across your courses.</p>

        {courses.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setCourseFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                courseFilter === "all"
                  ? "bg-[--color-primary] text-white"
                  : "bg-[--color-surface-raised] text-[--color-text-secondary] hover:text-[--color-text-primary]"
              }`}
            >
              All courses
            </button>
            {courses.map(([id, title]) => (
              <button
                key={id}
                onClick={() => setCourseFilter(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                  courseFilter === id
                    ? "bg-[--color-primary] text-white"
                    : "bg-[--color-surface-raised] text-[--color-text-secondary] hover:text-[--color-text-primary]"
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="premium-card h-20 rounded-[--radius-md] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="premium-card mt-8 flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]">
              <StickyNote className="h-7 w-7 text-[--color-primary]" />
            </span>
            <p className="mt-3 font-semibold text-[--color-text-secondary]">No notes yet</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Take notes while watching lessons — they&apos;ll show up here.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 transition-all"
            >
              Go to My Learning
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3 stagger-children">
            {filtered.map((note) => (
              <div key={note.id} className="premium-card rounded-[--radius-md] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-[--color-primary]" />
                    <Link
                      href={`/learn/${note.course_id}/${note.lesson_id}`}
                      className="truncate text-xs font-extrabold text-[--color-text-primary] hover:text-[--color-primary] transition-colors"
                    >
                      {note.course_title} — {note.lesson_title}
                    </Link>
                    {note.timestamp_seconds !== null && (
                      <span className="shrink-0 rounded bg-[--color-primary-subtle] px-1.5 py-0.5 text-[10px] font-mono text-[--brand-800]">
                        {formatTimestamp(note.timestamp_seconds)}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => { setEditingId(note.id); setEditText(note.content); }}
                      className="text-[--color-text-muted] hover:text-[--color-primary] transition-colors"
                      aria-label="Edit note"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-[--color-text-muted] hover:text-[--color-error] transition-colors"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === note.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] px-3 py-2 text-sm text-[--color-text-primary] focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(note.id)}
                        disabled={!editText.trim()}
                        className="rounded-[--radius-sm] bg-[--color-primary] px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40 hover:bg-[--color-primary-hover] transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-[--radius-sm] border border-[--color-border] px-3 py-1.5 text-xs font-extrabold text-[--color-text-secondary] hover:bg-[--color-surface-raised] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[--color-text-secondary] whitespace-pre-wrap">{note.content}</p>
                )}

                <p className="mt-2 text-[10px] text-[--color-text-muted]">
                  Updated {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
