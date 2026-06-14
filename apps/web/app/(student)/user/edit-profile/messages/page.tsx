"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AccountSubnav } from "@/components/shared/account-subnav";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ConversationRead, MessageRead } from "@/types";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^\d+:\s*(.*)$/s);
  const body = match?.[1];
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return fallback;
  }
  return fallback;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InboxSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="premium-card flex items-center gap-3 rounded-[--radius-md] p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your messages</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <MessageSquare className="h-12 w-12 text-[--color-text-muted]" />
      <p className="font-extrabold text-[--color-text-secondary]">No messages yet</p>
      <p className="max-w-md text-sm text-[--color-text-secondary]">
        Conversations with instructors and other students will show up here.
      </p>
      <Link href="/courses" className="mt-2">
        <Button>Browse courses</Button>
      </Link>
    </div>
  );
}

export default function MessagesPage() {
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<ConversationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState<ConversationRead | null>(null);
  const [thread, setThread] = useState<MessageRead[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadConversations() {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<ConversationRead[]>("/api/v1/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openThread(conversation: ConversationRead) {
    setSelected(conversation);
    setThreadLoading(true);
    try {
      const token = await getToken();
      const data = await apiFetch<MessageRead[]>(`/api/v1/messages/thread/${conversation.participant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setThread(data);
      setConversations((prev) =>
        prev.map((c) => (c.participant.id === conversation.participant.id ? { ...c, unread_count: 0 } : c))
      );
    } catch {
      toast.error("Couldn't load this conversation");
    } finally {
      setThreadLoading(false);
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      const message = await apiFetch<MessageRead>("/api/v1/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient_id: selected.participant.id, body: replyText.trim() }),
      });
      setThread((prev) => [...prev, message]);
      setConversations((prev) =>
        prev.map((c) => (c.participant.id === selected.participant.id ? { ...c, last_message: message } : c))
      );
      setReplyText("");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't send your message. Try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Messages</h1>
        <p className="mt-2 text-[--color-text-secondary]">Direct messages with instructors and students.</p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <InboxSkeleton />
        ) : error ? (
          <ErrorState onRetry={loadConversations} />
        ) : conversations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className={cn("space-y-2 md:col-span-1", selected ? "hidden md:block" : "")}>
              {conversations.map((conversation) => {
                const isActive = selected?.participant.id === conversation.participant.id;
                return (
                  <button
                    key={conversation.participant.id}
                    onClick={() => openThread(conversation)}
                    className={cn(
                      "hover-lift premium-card flex w-full items-center gap-3 rounded-[--radius-md] p-3 text-left transition-all",
                      isActive ? "ring-2 ring-[--color-primary]" : ""
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.participant.image_url ?? undefined} alt={conversation.participant.first_name} />
                      <AvatarFallback>
                        {conversation.participant.first_name[0]}
                        {conversation.participant.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-semibold text-[--color-text-primary]">
                        {conversation.participant.first_name} {conversation.participant.last_name}
                        {conversation.unread_count > 0 ? (
                          <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                            {conversation.unread_count}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-[--color-text-muted]">{conversation.last_message.body}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={cn("md:col-span-2", selected ? "" : "hidden md:block")}>
              {!selected ? (
                <div className="premium-card flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-[--radius-lg] p-6 text-center">
                  <MessageSquare className="h-10 w-10 text-[--color-text-muted]" />
                  <p className="font-extrabold text-[--color-text-secondary]">Select a conversation</p>
                </div>
              ) : (
                <div className="premium-card flex h-full flex-col rounded-[--radius-lg] p-4">
                  <div className="flex items-center gap-3 border-b border-[--color-border] pb-3">
                    <button onClick={() => setSelected(null)} className="md:hidden" aria-label="Back to conversations">
                      <ArrowLeft className="h-5 w-5 text-[--color-text-secondary]" />
                    </button>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selected.participant.image_url ?? undefined} alt={selected.participant.first_name} />
                      <AvatarFallback>
                        {selected.participant.first_name[0]}
                        {selected.participant.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-extrabold text-[--color-text-primary]">
                      {selected.participant.first_name} {selected.participant.last_name}
                    </p>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto py-4">
                    {threadLoading ? (
                      <>
                        <Skeleton className="h-12 w-2/3" />
                        <Skeleton className="ml-auto h-12 w-1/2" />
                      </>
                    ) : (
                      thread.map((message) => {
                        const isMine = message.sender_id !== selected.participant.id;
                        return (
                          <div key={message.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                            <div
                              className={cn(
                                "max-w-[80%] rounded-[--radius-md] px-3 py-2 text-sm",
                                isMine
                                  ? "bg-[image:var(--gradient-brand)] text-white"
                                  : "border border-[--color-border] bg-[--color-surface-raised] text-[--color-text-primary]"
                              )}
                            >
                              {message.body}
                            </div>
                            <span className="mt-1 text-[10px] text-[--color-text-muted]">{formatTime(message.created_at)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-end gap-2 border-t border-[--color-border] pt-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a message..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
