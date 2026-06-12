"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { PushSubscriptionManager } from "@/components/shared/push-subscription-manager";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Notification[]>("/api/v1/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(data);
        // mark all read
        await apiFetch("/api/v1/notifications/mark-all-read", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-4xl font-black tracking-tight text-[--color-text-primary]">Notifications</h1>

      <div className="mb-6">
        <PushSubscriptionManager />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[--radius-md]" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <img src="/brand/empty-state.svg" alt="" className="h-32 w-auto" />
          <Bell className="h-10 w-10 text-[--color-primary]" />
          <p className="font-extrabold text-[--color-text-secondary]">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-[--radius-md] border border-[--color-border] p-4 shadow-[var(--shadow-xs)] ${!n.is_read ? "bg-[--color-primary-subtle] border-l-2 border-l-[--color-primary]" : "bg-[--color-surface-raised]"}`}
            >
              {n.link ? (
                <Link href={n.link} className="block hover:opacity-80 transition-opacity">
                  <p className="font-semibold text-sm text-[--color-text-primary]">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-[--color-text-muted]">{n.body}</p>}
                </Link>
              ) : (
                <>
                  <p className="font-semibold text-sm text-[--color-text-primary]">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-[--color-text-muted]">{n.body}</p>}
                </>
              )}
              <p className="mt-1.5 text-xs text-[--color-text-muted]">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
