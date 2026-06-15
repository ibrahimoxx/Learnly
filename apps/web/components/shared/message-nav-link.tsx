"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface ConversationSummary {
  unread_count: number;
}

export function MessageNavLink() {
  const { isSignedIn, getToken } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    async function loadUnreadCount() {
      const token = await getToken();
      try {
        const conversations = await apiFetch<ConversationSummary[]>("/api/v1/messages/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setUnread(conversations.reduce((sum, c) => sum + c.unread_count, 0));
        }
      } catch {
        // ignore
      }
    }

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    window.addEventListener("messages:unread-changed", loadUnreadCount);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("messages:unread-changed", loadUnreadCount);
    };
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSignedIn) return null;

  return (
    <Link
      href="/user/edit-profile/messages"
      aria-label="Messages"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-[--color-text-secondary] transition-colors hover:bg-[--color-primary-subtle] hover:text-[--brand-800]"
    >
      <MessageSquare className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[--color-primary] text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
