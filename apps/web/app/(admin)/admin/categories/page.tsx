"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  course_count: number;
  subcategories: AdminCategory[];
}

function flatten(categories: AdminCategory[], depth = 0): { cat: AdminCategory; depth: number }[] {
  return categories.flatMap((cat) => [{ cat, depth }, ...flatten(cat.subcategories, depth + 1)]);
}

export default function AdminCategoriesPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const token = await getToken();
    try {
      const data = await apiFetch<AdminCategory[]>("/api/v1/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [getToken]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch("/api/v1/admin/categories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, slug, parent_id: parentId || null }),
      });
      setName("");
      setSlug("");
      setParentId("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const token = await getToken();
      await apiFetch(`/api/v1/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cannot delete category — it may still have courses or subcategories");
    }
  }

  const rows = flatten(categories);

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Categories</h1>

      <form onSubmit={handleCreate} className="premium-card mb-6 rounded-[--radius-lg] p-5">
        <h2 className="mb-3 text-sm font-extrabold text-[--color-text-primary]">Add category</h2>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required className="max-w-xs" />
          <Input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className="max-w-xs" />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-primary]"
          >
            <option value="">No parent (top-level)</option>
            {rows.map(({ cat, depth }) => (
              <option key={cat.id} value={cat.id}>
                {"— ".repeat(depth)}{cat.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-[--color-error]">{error}</p>}
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-[--radius-md]" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-12 text-center">
          <FolderTree className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">No categories yet. Add one above to get started.</p>
        </div>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Name", "Slug", "Courses", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {rows.map(({ cat, depth }) => (
                <tr key={cat.id} className="transition-colors hover:bg-[--color-primary-subtle]/40">
                  <td className="px-4 py-3 font-bold text-[--color-text-primary]" style={{ paddingLeft: `${16 + depth * 24}px` }}>
                    {depth > 0 && <span className="mr-1 text-[--color-text-muted]">└</span>}
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[--color-text-secondary]">{cat.slug}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{cat.course_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-[--color-error] transition-opacity hover:opacity-70"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
