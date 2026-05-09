"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { isSignedIn, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    const token = await getToken();
    try {
      const data = await apiFetch<Notification[]>("/api/v1/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    const token = await getToken();
    try {
      await apiFetch("/api/v1/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  }

  if (!isSignedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        className="relative p-1.5 text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[--color-primary] text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-[--radius-md] border border-[--color-border] bg-white shadow-[0_4px_20px_rgba(0,0,0,.12)]">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-3">
            <span className="text-sm font-semibold text-[--color-text-primary]">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-[--color-primary] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[--color-text-muted]">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-[--color-border] last:border-0 px-4 py-3 ${!n.is_read ? "bg-blue-50/40" : ""}`}
                >
                  {n.link ? (
                    <Link href={n.link} onClick={() => setOpen(false)} className="block">
                      <p className="text-sm font-medium text-[--color-text-primary] line-clamp-1">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-[--color-text-muted] line-clamp-2">{n.body}</p>}
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-[--color-text-primary] line-clamp-1">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-[--color-text-muted] line-clamp-2">{n.body}</p>}
                    </>
                  )}
                  <p className="mt-1 text-[10px] text-[--color-text-muted]">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
