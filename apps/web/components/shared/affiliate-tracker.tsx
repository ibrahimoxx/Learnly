"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AffiliateTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("ref");
    if (!code) return;

    const sanitized = code.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 20);
    if (!sanitized) return;

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `affiliate_ref=${sanitized}; path=/; max-age=2592000; SameSite=Lax${secure}`;
    // localStorage backup survives Clerk OAuth redirects that may drop query params
    try { localStorage.setItem("affiliate_ref", sanitized); } catch { /* private browsing */ }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/api/v1/affiliate/track/${sanitized}`, { method: "POST" }).catch(() => undefined);
  }, [searchParams]);

  return null;
}
