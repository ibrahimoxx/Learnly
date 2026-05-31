"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Check, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface AdminAffiliateLink {
  instructor_id: string;
  instructor_email: string;
  instructor_name: string;
  code: string;
  commission_pct: number;
  click_count: number;
  is_active: boolean;
  total_conversions: number;
}

export default function AdminAffiliatesPage() {
  const { getToken } = useAuth();
  const [links, setLinks] = useState<AdminAffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<AdminAffiliateLink[]>("/api/v1/admin/affiliates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLinks(data);
      } catch {
        toast.error("Failed to load affiliate links");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  function startEdit(link: AdminAffiliateLink) {
    setEditingId(link.instructor_id);
    setEditValue(String(link.commission_pct));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveCommission(instructorId: string) {
    const pct = parseInt(editValue, 10);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      toast.error("Commission must be 1–100");
      return;
    }
    setSaving(true);
    const token = await getToken();
    try {
      const updated = await apiFetch<AdminAffiliateLink>(
        `/api/v1/admin/affiliates/${instructorId}/commission`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ commission_pct: pct }),
        }
      );
      setLinks((prev) =>
        prev.map((l) => (l.instructor_id === instructorId ? updated : l))
      );
      setEditingId(null);
      toast.success("Commission updated");
    } catch {
      toast.error("Failed to update commission");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Affiliate Links</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Manage commission rates for each instructor's referral link.
        </p>
      </div>

      <div className="rounded-[--radius-md] border border-[--color-border] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--color-border] bg-[--color-surface]">
              <th className="px-5 py-3 text-left text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Instructor</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Code</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Commission</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Clicks</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Conversions</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[--color-border]">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : links.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[--color-text-muted]">
                    No affiliate links yet. Instructors get a link when they visit the Affiliate page.
                  </td>
                </tr>
              )
              : links.map((link) => (
                <tr key={link.instructor_id} className="border-b border-[--color-border] last:border-0 hover:bg-[--color-surface]/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[--color-text-primary]">{link.instructor_name}</p>
                    <p className="text-xs text-[--color-text-muted]">{link.instructor_email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-[--color-surface] px-1.5 py-0.5 text-xs font-mono text-[--color-text-secondary]">
                      {link.code}
                    </code>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {editingId === link.instructor_id ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-16 rounded border border-[--color-border] px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCommission(link.instructor_id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <span className="text-xs text-[--color-text-muted]">%</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-[--color-text-primary]">{link.commission_pct}%</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-[--color-text-secondary]">{link.click_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center text-[--color-text-secondary]">{link.total_conversions.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={link.is_active ? "success" : "secondary"} className="text-[10px]">
                      {link.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {editingId === link.instructor_id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          className="h-7 gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => saveCommission(link.instructor_id)}
                          disabled={saving}
                        >
                          <Check className="h-3 w-3" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={cancelEdit} disabled={saving}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => startEdit(link)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
