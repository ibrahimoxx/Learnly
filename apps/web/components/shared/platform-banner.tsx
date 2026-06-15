"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Megaphone, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: "all" | "students" | "instructors";
}

const DISMISSED_KEY = "platform-announcements-dismissed";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function PlatformBanner() {
  const { getToken, isLoaded } = useAuth();
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoaded) return;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<PlatformAnnouncement[]>("/api/v1/announcements/active", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setAnnouncements(data);
        setDismissed(getDismissed());
      } catch {
        // Banner is non-critical — fail silently
      }
    }
    load();
  }, [isLoaded, getToken]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  }

  return (
    <div className="relative z-40 space-y-px">
      {visible.map((a) => (
        <div
          key={a.id}
          role="banner"
          className="flex items-center justify-between gap-3 bg-[image:var(--gradient-brand)] px-4 py-2.5 text-sm text-white sm:px-6"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="h-4 w-4 shrink-0" />
            <p className="truncate">
              <span className="font-extrabold">{a.title}</span>
              <span className="ml-2 text-white/90">{a.body}</span>
            </p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            aria-label="Dismiss announcement"
            className="shrink-0 rounded-lg p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
