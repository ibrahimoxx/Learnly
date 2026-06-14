"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  BookOpen,
  Gift,
  Megaphone,
  MessageCircle,
  Star,
  type LucideIcon,
} from "lucide-react";
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

function getNotificationVisual(type: string): { Icon: LucideIcon; bg: string; color: string } {
  switch (type) {
    case "gift_received":
    case "gift_sent":
      return {
        Icon: Gift,
        bg: "bg-[--color-primary-subtle]",
        color: "text-[--color-primary]",
      };
    case "badge_earned":
      return {
        Icon: Award,
        bg: "bg-[--color-warning]/15",
        color: "text-[--color-warning]",
      };
    case "enrollment":
      return {
        Icon: BookOpen,
        bg: "bg-[--color-success]/15",
        color: "text-[--color-success]",
      };
    case "review":
      return {
        Icon: Star,
        bg: "bg-[--color-star]/15",
        color: "text-[--color-star]",
      };
    case "qa_reply":
      return {
        Icon: MessageCircle,
        bg: "bg-[--color-primary-subtle]",
        color: "text-[--color-primary]",
      };
    case "announcement":
      return {
        Icon: Megaphone,
        bg: "bg-[--color-primary-subtle]",
        color: "text-[--color-primary]",
      };
    default:
      return {
        Icon: Bell,
        bg: "bg-[--color-surface]",
        color: "text-[--color-text-muted]",
      };
  }
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
        <div className="animate-scale-in absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[--radius-lg] border border-white/70 bg-[--color-surface-glass] shadow-[var(--shadow-xl)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[--color-border] px-4 py-3">
            <span className="text-sm font-extrabold text-[--color-text-primary]">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[--color-primary] transition-colors hover:bg-[--color-primary-subtle]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[--color-primary-subtle]">
                  <Bell className="h-5 w-5 text-[--color-primary]" />
                </div>
                <p className="text-sm font-semibold text-[--color-text-primary]">No notifications yet</p>
                <p className="text-xs text-[--color-text-muted]">
                  We&apos;ll let you know when something arrives.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const { Icon, bg, color } = getNotificationVisual(n.type);

                if (n.link) {
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => {
                        markNotificationRead(n);
                        setOpen(false);
                      }}
                      className={`relative flex gap-3 rounded-[--radius-md] p-2.5 transition-colors hover:bg-[--color-surface-raised] ${!n.is_read ? "bg-[--color-primary-subtle]" : ""}`}
                    >
                      <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                        {!n.is_read && (
                          <span
                            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[--color-primary] ring-2 ring-[--color-surface-glass]"
                            aria-hidden="true"
                          />
                        )}
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-[--color-text-primary]">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[--color-text-secondary]">{n.body}</p>
                        )}
                        <p className="mt-1 text-[10px] text-[--color-text-muted]">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  );
                }

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markNotificationRead(n)}
                    className={`relative flex w-full gap-3 rounded-[--radius-md] p-2.5 text-left transition-colors hover:bg-[--color-surface-raised] ${!n.is_read ? "bg-[--color-primary-subtle]" : ""}`}
                  >
                    <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                      {!n.is_read && (
                        <span
                          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[--color-primary] ring-2 ring-[--color-surface-glass]"
                          aria-hidden="true"
                        />
                      )}
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-[--color-text-primary]">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[--color-text-secondary]">{n.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-[--color-text-muted]">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-[--color-border] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-[--radius-sm] px-4 py-2.5 text-center text-xs font-semibold text-[--color-primary] transition-colors hover:bg-[--color-primary-subtle]"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
