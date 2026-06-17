"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface WishlistButtonProps {
  courseId: string;
  iconOnly?: boolean;
  onToggle?: (saved: boolean) => void;
}

export function WishlistButton({ courseId, iconOnly = false, onToggle }: WishlistButtonProps) {
  const { isSignedIn, getToken } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    async function check() {
      const token = await getToken();
      try {
        const items = await apiFetch<{ course_id: string }[]>("/api/v1/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const isSaved = items.some((i) => i.course_id === courseId);
        setSaved(isSaved);
        onToggle?.(isSaved);
      } catch {
        // silently ignore
      }
    }
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, courseId]);

  if (!mounted || !isSignedIn) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    const nextSaved = !saved;
    // Optimistic update + pulse animation
    setSaved(nextSaved);
    onToggle?.(nextSaved);
    if (nextSaved) { setPulse(true); setTimeout(() => setPulse(false), 400); }
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/wishlist/${courseId}`, {
        method: nextSaved ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // revert on failure
      setSaved(!nextSaved);
      onToggle?.(!nextSaved);
    } finally {
      setLoading(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        style={{ transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${
          pulse ? "scale-125" : "scale-100"
        } ${
          saved
            ? "border-red-500 bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            : "border-gray-200 bg-white text-gray-400 hover:border-red-400 hover:text-red-400"
        }`}
      >
        <Heart
          className="h-3.5 w-3.5"
          style={{
            fill: saved ? "white" : "transparent",
            stroke: saved ? "white" : "currentColor",
            transition: "all 0.2s ease",
          }}
        />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-all duration-200 disabled:opacity-50 ${
        saved
          ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
          : "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
      }`}
    >
      <Heart
        className="h-3.5 w-3.5"
        style={{ fill: saved ? "currentColor" : "transparent", transition: "fill 0.2s ease" }}
      />
      {saved ? "Wishlisted" : "Add to wishlist"}
    </button>
  );
}
