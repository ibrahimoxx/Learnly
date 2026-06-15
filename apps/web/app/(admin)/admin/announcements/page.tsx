"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: "all" | "students" | "instructors";
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "students" | "instructors">("all");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const token = await getToken();
    try {
      const data = await apiFetch<PlatformAnnouncement[]>("/api/v1/admin/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(data);
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
      await apiFetch("/api/v1/admin/announcements", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body, audience }),
      });
      setTitle("");
      setBody("");
      setAudience("all");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(item: PlatformAnnouncement) {
    const token = await getToken();
    const updated = await apiFetch<PlatformAnnouncement>(`/api/v1/admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    await apiFetch(`/api/v1/admin/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Announcements</h1>

      <form onSubmit={handleCreate} className="premium-card mb-6 rounded-[--radius-lg] p-5">
        <h2 className="mb-3 text-sm font-extrabold text-[--color-text-primary]">New banner</h2>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required rows={3} />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "all" | "students" | "instructors")}
              className="rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-primary]"
            >
              <option value="all">Everyone</option>
              <option value="students">Students</option>
              <option value="instructors">Instructors</option>
            </select>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              <Plus className="h-4 w-4" /> Publish
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-[--color-error]">{error}</p>}
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[--radius-md]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">No announcements yet. Publish one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`premium-card rounded-[--radius-lg] p-5 ${!item.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[--color-text-primary]">{item.title}</p>
                  <p className="mt-1 text-sm text-[--color-text-secondary]">{item.body}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-[--color-text-muted]">
                    Audience: {item.audience} · Created {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} aria-label={`Toggle ${item.title} active`} />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-[--color-error] transition-opacity hover:opacity-70"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
