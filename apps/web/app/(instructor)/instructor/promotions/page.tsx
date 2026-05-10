"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Tag, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromotionsPage() {
  const { getToken } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    max_uses: "",
    expires_at: "",
  });

  async function load() {
    const token = await getToken();
    try {
      const data = await apiFetch<Coupon[]>("/api/v1/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(data);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return;
    setCreating(true);
    const token = await getToken();
    try {
      await apiFetch("/api/v1/coupons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: parseInt(form.discount_value),
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      });
      toast.success("Coupon created");
      setForm({ code: "", discount_type: "percent", discount_value: "", max_uses: "", expires_at: "" });
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create coupon";
      toast.error(msg.includes("409") ? "Code already exists" : msg);
    } finally {
      setCreating(false);
    }
  }

  async function deactivate(code: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/coupons/${code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons((prev) => prev.map((c) => c.code === code ? { ...c, is_active: false } : c));
      toast.success("Coupon deactivated");
    } catch {
      toast.error("Failed to deactivate");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Tag className="h-5 w-5 text-[--color-primary]" />
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Promotions & Coupons</h1>
      </div>

      {/* Create form */}
      <div className="rounded-[--radius-md] border border-[--color-border] bg-white p-5 mb-6">
        <h2 className="font-semibold text-[--color-text-primary] mb-4">Create coupon</h2>
        <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-[--color-text-muted]">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              required
              className="mt-1 w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[--color-text-muted]">Discount type</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
              className="mt-1 w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            >
              <option value="percent">Percent off (%)</option>
              <option value="fixed">Fixed amount (cents)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[--color-text-muted]">
              {form.discount_type === "percent" ? "Percent (1-100)" : "Amount in cents"}
            </label>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              placeholder={form.discount_type === "percent" ? "20" : "1000"}
              required
              min={1}
              max={form.discount_type === "percent" ? 100 : undefined}
              className="mt-1 w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[--color-text-muted]">Max uses (optional)</label>
            <input
              type="number"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="Unlimited"
              min={1}
              className="mt-1 w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[--color-text-muted]">Expires at (optional)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="mt-1 w-full rounded-[--radius-sm] border border-[--color-border] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end pt-1">
            <button
              type="submit"
              disabled={creating}
              style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
              className="flex items-center gap-2 rounded-[--radius-sm] px-5 py-2 text-sm font-semibold disabled:opacity-50 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Creating…" : "Create coupon"}
            </button>
          </div>
        </form>
      </div>

      {/* Coupon list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-[--radius-md]" />)}
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-[--color-text-muted] text-center py-10">No coupons yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-4 rounded-[--radius-md] border px-4 py-3 ${
                c.is_active ? "border-[--color-border] bg-white" : "border-[--color-border] bg-[--color-surface] opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-[--color-text-primary]">{c.code}</span>
                <span className="text-xs text-[--color-text-muted]">
                  {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${(c.discount_value / 100).toFixed(2)} off`}
                </span>
                <span className="text-xs text-[--color-text-muted]">
                  {c.uses_count}/{c.max_uses ?? "∞"} uses
                </span>
                {!c.is_active && <span className="text-xs text-red-400 font-medium">Inactive</span>}
              </div>
              {c.is_active && (
                <button
                  onClick={() => deactivate(c.code)}
                  className="text-[--color-text-muted] hover:text-red-400 transition-colors"
                  title="Deactivate"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
