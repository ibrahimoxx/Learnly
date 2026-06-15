"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Flag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  updated_at: string;
}

export default function AdminFlagsPage() {
  const { getToken } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const token = await getToken();
    try {
      const data = await apiFetch<FeatureFlag[]>("/api/v1/admin/feature-flags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFlags(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [getToken]);

  async function toggleFlag(flag: FeatureFlag) {
    const token = await getToken();
    const updated = await apiFetch<FeatureFlag>(`/api/v1/admin/feature-flags/${flag.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_enabled: !flag.is_enabled }),
    });
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      await apiFetch("/api/v1/admin/feature-flags", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, label, description: description || null, is_enabled: false }),
      });
      setKey("");
      setLabel("");
      setDescription("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create flag");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-5 text-4xl font-black tracking-tight text-[--color-text-primary]">Feature Flags</h1>

      <form onSubmit={handleCreate} className="premium-card mb-6 rounded-[--radius-lg] p-5">
        <h2 className="mb-3 text-sm font-extrabold text-[--color-text-primary]">Add flag</h2>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="key (e.g. feature_live_sessions)" value={key} onChange={(e) => setKey(e.target.value)} required className="max-w-xs" />
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} required className="max-w-xs" />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="max-w-xs" />
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
      ) : flags.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] py-12 text-center">
          <Flag className="mx-auto mb-3 h-10 w-10 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">No feature flags yet. Add one above.</p>
        </div>
      ) : (
        <div className="premium-card rounded-[--radius-lg]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-border] bg-[--color-surface]">
              <tr>
                {["Key", "Label", "Description", "Enabled"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[--color-text-muted]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {flags.map((flag) => (
                <tr key={flag.id} className="transition-colors hover:bg-[--color-primary-subtle]/40">
                  <td className="px-4 py-3 font-mono font-bold text-[--color-text-primary]">{flag.key}</td>
                  <td className="px-4 py-3 text-[--color-text-secondary]">{flag.label}</td>
                  <td className="px-4 py-3 text-[--color-text-muted]">{flag.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Switch checked={flag.is_enabled} onCheckedChange={() => toggleFlag(flag)} aria-label={`Toggle ${flag.label}`} />
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
