"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Edit, GraduationCap, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { LearningPath } from "@/types";

export default function InstructorPathsPage() {
  const { getToken } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<LearningPath[]>("/api/v1/learning-paths", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPaths(data);
      } catch {
        setPaths([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  function deriveSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function createPath() {
    if (!title.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      const path = await apiFetch<LearningPath>("/api/v1/learning-paths", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), slug: slug.trim() }),
      });
      setPaths((prev) => [path, ...prev]);
      setShowCreate(false);
      setTitle("");
      setSlug("");
      toast.success("Path created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create path");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[--color-text-primary]">Learning Paths</h1>
          <p className="mt-1 text-sm text-[--color-text-muted]">Create curated course sequences</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Path
        </Button>
      </div>

      {showCreate && (
        <div className="premium-card mt-6 rounded-[--radius-lg] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[--color-text-primary]">Create new path</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">Title</label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(deriveSlug(e.target.value));
                }}
                placeholder="e.g. Full-Stack Web Development"
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && createPath()}
              />
            </div>
            <div className="w-full sm:w-60">
              <label className="mb-1 block text-xs font-medium text-[--color-text-secondary]">Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="full-stack-web-dev"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createPath} disabled={creating || !title.trim() || !slug.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setTitle(""); setSlug(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-[--radius-md]" />)}
          </div>
        ) : paths.length === 0 ? (
          <div className="premium-card flex flex-col items-center justify-center rounded-[--radius-lg] py-20 text-center">
            <img src="/brand/empty-state.svg" alt="" className="mb-3 h-32 w-auto" />
            <GraduationCap className="h-12 w-12 text-[--color-primary]" />
            <p className="relative mt-3 font-extrabold text-[--color-text-secondary]">No paths yet</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">Create a path to guide students through a learning journey.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paths.map((path) => (
              <div
                key={path.id}
                className="hover-lift premium-card flex items-center gap-4 rounded-[--radius-md] p-4"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary-subtle]">
                  <GraduationCap className="h-5 w-5 text-[--color-primary]" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-sm text-[--color-text-primary]">{path.title}</p>
                    <Badge variant={path.status === "published" ? "success" : "secondary"}>
                      {path.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-[--color-text-muted] flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {path.course_count} course{path.course_count !== 1 ? "s" : ""} · /{path.slug}
                  </p>
                </div>
                <Link href={`/instructor/paths/${path.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
