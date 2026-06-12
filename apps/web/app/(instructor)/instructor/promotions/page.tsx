"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Tag, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface CouponRead {
  id: string;
  course_id: string | null;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
}

interface Course {
  id: string;
  title: string;
}

export default function PromotionsPage() {
  const { getToken } = useAuth();
  const [coupons, setCoupons] = useState<CouponRead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("__global__");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const [couponsData, coursesData] = await Promise.all([
        apiFetch<CouponRead[]>("/api/v1/coupons", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch<Course[]>("/api/v1/courses/mine", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => [] as Course[]),
      ]);
      setCoupons(couponsData.filter((c) => c.is_active));
      setCourses(coursesData);
    } catch {
      toast.error("Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function createCoupon() {
    if (!code.trim() || !discountValue) return;
    const token = await getToken();
    setCreating(true);
    try {
      const created = await apiFetch<CouponRead>("/api/v1/coupons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_id: selectedCourse === "__global__" ? null : selectedCourse,
          code: code.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: discountType === "percent"
            ? parseInt(discountValue)
            : Math.round(parseFloat(discountValue) * 100),
          max_uses: maxUses ? parseInt(maxUses) : null,
        }),
      });
      setCoupons((prev) => [created, ...prev]);
      setCode(""); setDiscountValue(""); setMaxUses("");
      toast.success(`Coupon ${created.code} created.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg.includes("409") ? "Code already exists" : "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function deactivate(couponCode: string) {
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/coupons/${couponCode}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons((prev) => prev.filter((c) => c.code !== couponCode));
      toast.success("Coupon deactivated.");
    } catch {
      toast.error("Failed to deactivate.");
    }
  }

  function courseLabel(courseId: string | null) {
    if (!courseId) return "All courses";
    return courses.find((c) => c.id === courseId)?.title ?? courseId.slice(0, 8);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <Tag className="h-5 w-5 text-[--color-text-muted]" />
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Promotions</h1>
      </div>

      <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-6 shadow-[var(--shadow-xs)] space-y-4">
        <h2 className="font-semibold text-[--color-text-primary]">Create coupon</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input placeholder="Code (e.g. SAVE20)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
            className="rounded-[--radius-sm] border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          >
            <option value="percent">% Off</option>
            <option value="fixed">$ Fixed</option>
          </select>
          <Input
            placeholder={discountType === "percent" ? "e.g. 20" : "e.g. 5.00"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            type="number" min="1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="rounded-[--radius-sm] border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          >
            <option value="__global__">All courses (global)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <Input placeholder="Max uses (optional)" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" min="1" />
        </div>
        <Button onClick={createCoupon} disabled={creating || !code || !discountValue} size="sm">
          <Plus className="h-4 w-4" />
          {creating ? "Creating…" : "Create coupon"}
        </Button>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-[--color-text-secondary] mb-3">Active coupons ({coupons.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-[--radius-sm] bg-[--color-border]" />)}
          </div>
        ) : coupons.length === 0 ? (
          <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] py-10 shadow-[var(--shadow-xs)] text-center">
            <p className="text-sm text-[--color-text-muted]">No active coupons.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-4 py-3 shadow-[var(--shadow-xs)] transition-colors hover:border-[--color-primary]/40">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-bold text-[--color-text-primary]">{c.code}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${(c.discount_value / 100).toFixed(2)} off`}
                  </Badge>
                  <span className="text-xs text-[--color-text-muted] truncate">{courseLabel(c.course_id)}</span>
                  {c.max_uses && <span className="text-xs text-[--color-text-muted] shrink-0">{c.uses_count}/{c.max_uses} uses</span>}
                </div>
                <button onClick={() => deactivate(c.code)} className="ml-3 shrink-0 p-1 text-[--color-text-muted] hover:text-[--color-error] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
