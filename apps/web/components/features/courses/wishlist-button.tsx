"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface WishlistButtonProps {
  courseId: string;
}

export function WishlistButton({ courseId }: WishlistButtonProps) {
  const { isSignedIn, getToken } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    async function check() {
      const token = await getToken();
      try {
        const items = await apiFetch<{ course_id: string }[]>("/api/v1/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaved(items.some((i) => i.course_id === courseId));
      } catch {
        // not signed in or error
      }
    }
    check();
  }, [isSignedIn, courseId, getToken]);

  if (!isSignedIn) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const token = await getToken();
    try {
      if (saved) {
        await apiFetch(`/api/v1/wishlist/${courseId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaved(false);
      } else {
        await apiFetch(`/api/v1/wishlist/${courseId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaved(true);
      }
    } catch {
      // ignore 409 (already saved)
      if (!saved) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center gap-1.5 rounded-[--radius-sm] border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
        saved
          ? "border-red-400 bg-red-50 text-red-500 hover:bg-red-100"
          : "border-[--color-border] text-[--color-text-secondary] hover:border-red-300 hover:text-red-400"
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${saved ? "fill-red-400 text-red-400" : ""}`} />
      {saved ? "Wishlisted" : "Add to wishlist"}
    </button>
  );
}
