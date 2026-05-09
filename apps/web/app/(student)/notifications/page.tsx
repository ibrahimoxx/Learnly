"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[--color-text-primary] mb-6">Notifications</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[--radius-md]" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell className="h-10 w-10 text-[--color-border]" />
          <p className="font-semibold text-[--color-text-secondary]">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-[--radius-md] border border-[--color-border] p-4 ${!n.is_read ? "bg-blue-50/40" : "bg-white"}`}
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
  );
}
