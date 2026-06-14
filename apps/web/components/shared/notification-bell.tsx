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

  async function markNotificationRead(notification: Notification) {
    if (notification.is_read) return;

    const token = await getToken();
    try {
      await apiFetch(`/api/v1/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
      setUnread((prev) => Math.max(0, notification.is_read ? prev : prev - 1));
    } catch {
      // ignore
    }
  }

  if (!isSignedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-[--color-text-secondary] transition-colors hover:bg-[--color-primary-subtle] hover:text-[--brand-800]"
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
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[--radius-lg] border border-white/70 bg-[--color-surface-glass] shadow-[var(--shadow-xl)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-3">
            <span className="text-sm font-semibold text-[--color-text-primary]">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-[--color-primary] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[--color-text-muted]">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative border-b border-[--color-border] last:border-0 px-4 py-3 transition-colors hover:bg-[--color-surface] ${!n.is_read ? "bg-[--color-primary-subtle]" : ""}`}
                >
                  {!n.is_read && (
                    <span className="absolute left-4 top-4 h-2 w-2 rounded-full bg-[--color-primary]" aria-hidden="true" />
                  )}
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        markNotificationRead(n);
                        setOpen(false);
                      }}
                      className={`block ${!n.is_read ? "pl-3" : ""}`}
                    >
                      <p className="text-sm font-medium text-[--color-text-primary] line-clamp-1">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-[--color-text-muted] line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-[--color-text-muted]">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n)}
                      className={`block w-full text-left ${!n.is_read ? "pl-3" : ""}`}
                    >
                      <p className="text-sm font-medium text-[--color-text-primary] line-clamp-1">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-[--color-text-muted] line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-[--color-text-muted]">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[--color-border] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-[--color-primary] hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
