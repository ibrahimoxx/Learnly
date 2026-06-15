"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

const CURRENCIES = ["EUR", "USD", "GBP"];

export default function CoursePricingPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const course = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFree(course.is_free);
      setPrice((course.price_in_cents / 100).toFixed(2));
      setCurrency(course.currency);
    } catch {
      toast.error("Failed to load pricing.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const token = await getToken();
    setSaving(true);
    try {
      const priceInCents = isFree ? 0 : Math.round(parseFloat(price || "0") * 100);
      await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_free: isFree, price_in_cents: priceInCents, currency }),
      });
      toast.success("Pricing saved.");
    } catch {
      toast.error("Failed to save pricing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Pricing</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Set the price for your course or make it free for everyone.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isFree}
            onClick={() => setIsFree((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isFree ? "bg-[--color-primary]" : "bg-[--color-border]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isFree ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-[--color-text-primary]">
            This course is free
          </span>
        </div>

        {!isFree && (
          <div className="mt-4 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">
                Price
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/accessibility`}>
          <Button variant="outline" size="sm">Back: Accessibility</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/instructor/courses/${id}/manage/communications/welcome`}>
            <Button variant="outline" size="sm">Next: Messages</Button>
          </Link>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save pricing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
