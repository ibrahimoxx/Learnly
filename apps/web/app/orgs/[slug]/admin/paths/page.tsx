"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { BookOpen, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  course_count: number;
  created_at: string;
}

export default function OrgPathsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [pathSlug, setPathSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = await getToken();
    try {
      const data = await apiFetch<LearningPath[]>("/api/v1/learning-paths", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPaths(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [getToken]);

  function toSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch<LearningPath>("/api/v1/learning-paths", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, slug: pathSlug, description: description || null }),
      });
      setTitle("");
      setPathSlug("");
      setDescription("");
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create path");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[--color-text-primary]">
            Learning Paths
          </h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Curated course sequences for your team members.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="gap-2 shrink-0"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Path"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="premium-card mb-6 rounded-[--radius-lg] p-5 space-y-4"
        >
          <h2 className="font-semibold text-[--color-text-primary]">Create Learning Path</h2>
          {error && (
            <p className="rounded-[--radius-md] bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">
                Title
              </label>
              <Input
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!pathSlug || pathSlug === toSlug(title)) {
                    setPathSlug(toSlug(e.target.value));
                  }
                }}
                placeholder="e.g. Frontend Developer Track"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">
                Slug
              </label>
              <Input
                required
                value={pathSlug}
                onChange={(e) => setPathSlug(toSlug(e.target.value))}
                placeholder="e.g. frontend-developer-track"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will members learn in this path?"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create Path"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[--radius-lg]" />
          ))}
        </div>
      ) : paths.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="font-medium text-[--color-text-secondary]">No learning paths yet</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">
            Create a path to guide your team through a curated course sequence.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Create First Path
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <a
              key={p.id}
              href={`/learning-paths/${p.slug}`}
              className="hover-lift premium-card flex flex-col rounded-[--radius-lg] p-5 hover:border-[--color-primary]/40"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                  <BookOpen className="h-4 w-4 text-[--color-primary]" />
                </div>
                <Badge
                  variant={p.status === "published" ? "success" : "secondary"}
                  className="shrink-0"
                >
                  {p.status}
                </Badge>
              </div>
              <h3 className="font-bold text-[--color-text-primary] line-clamp-2">{p.title}</h3>
              {p.description && (
                <p className="mt-1 text-xs text-[--color-text-muted] line-clamp-2">
                  {p.description}
                </p>
              )}
              <div className="mt-auto pt-4 text-xs text-[--color-text-muted]">
                {p.course_count} {p.course_count === 1 ? "course" : "courses"} ·{" "}
                {new Date(p.created_at).toLocaleDateString()}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
