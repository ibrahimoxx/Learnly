"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function PushSubscriptionManager() {
  const { getToken } = useAuth();
  const [permission, setPermission] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON();
      const keys = json.keys ?? {};
      const token = await getToken();
      await apiFetch("/api/v1/push/subscribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys["p256dh"] ?? "",
          auth: keys["auth"] ?? "",
        }),
      });
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      const json = sub.toJSON();
      const keys = json.keys ?? {};
      const token = await getToken();
      await apiFetch("/api/v1/push/subscribe", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys["p256dh"] ?? "",
          auth: keys["auth"] ?? "",
        }),
      });
      await sub.unsubscribe();
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (permission === "unsupported") return null;

  return (
    <div className="flex items-center gap-3 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-4 py-3">
      {permission === "denied" ? (
        <>
          <BellOff className="h-4 w-4 shrink-0 text-[--color-text-muted]" />
          <p className="text-sm text-[--color-text-muted]">
            Push notifications blocked — allow them in browser settings to enable.
          </p>
        </>
      ) : subscribed ? (
        <>
          <BellRing className="h-4 w-4 shrink-0 text-[--color-primary]" />
          <p className="flex-1 text-sm text-[--color-text-secondary]">Push notifications enabled</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisable}
            disabled={loading}
            className="text-xs text-[--color-text-muted] hover:text-[--color-text-primary]"
          >
            Disable
          </Button>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 shrink-0 text-[--color-text-muted]" />
          <p className="flex-1 text-sm text-[--color-text-secondary]">
            Get notified about badges and updates even when the tab is closed
          </p>
          <Button size="sm" onClick={handleEnable} disabled={loading}>
            Enable
          </Button>
        </>
      )}
    </div>
  );
}
