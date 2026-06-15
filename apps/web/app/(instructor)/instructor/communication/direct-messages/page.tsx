"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ConversationRead, MessageRead } from "@/types";

interface ComposeTarget {
  id: string;
  name: string;
  courseId: string | null;
}

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

function InboxSkeleton() {
  return (
    <div className="space-y-3">
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
    <div className="premium-card flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your messages</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="premium-card flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <MessageSquare className="h-12 w-12 text-[--color-text-muted]" />
      <p className="font-extrabold text-[--color-text-secondary]">No messages yet</p>
      <p className="max-w-md text-sm text-[--color-text-secondary]">
        Direct messages from your students will show up here.
      </p>
      <Link href="/instructor/courses" className="mt-2">
        <Button>Go to My Courses</Button>
      </Link>
    </div>
  );
}

function InstructorDirectMessagesContent() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState<ConversationRead | null>(null);
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [thread, setThread] = useState<MessageRead[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadConversations(): Promise<ConversationRead[]> {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<ConversationRead[]>("/api/v1/messages/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(data);
      return data;
    } catch {
      setError(true);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function openThread(conversation: ConversationRead) {
    setComposeTarget(null);
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

  useEffect(() => {
    async function init() {
      const data = await loadConversations();
      const to = searchParams.get("to");
      if (!to) return;
      const existing = data.find((c) => c.participant.id === to);
      if (existing) {
        openThread(existing);
      } else {
        setComposeTarget({
          id: to,
          name: searchParams.get("name") || "New conversation",
          courseId: searchParams.get("course"),
        });
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReply() {
    if (!replyText.trim() || (!selected && !composeTarget)) return;
    setSending(true);
    try {
      const token = await getToken();
      const recipientId = selected ? selected.participant.id : composeTarget!.id;
      const message = await apiFetch<MessageRead>("/api/v1/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipient_id: recipientId,
          body: replyText.trim(),
          ...(composeTarget?.courseId ? { course_id: composeTarget.courseId } : {}),
        }),
      });
      setReplyText("");
      if (selected) {
        setThread((prev) => [...prev, message]);
        setConversations((prev) =>
          prev.map((c) => (c.participant.id === selected.participant.id ? { ...c, last_message: message } : c))
        );
      } else if (composeTarget) {
        const data = await loadConversations();
        const conversation = data.find((c) => c.participant.id === composeTarget.id);
        setComposeTarget(null);
        if (conversation) {
          setSelected(conversation);
          setThread([message]);
        }
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't send your message. Try again."));
    } finally {
      setSending(false);
    }
  }

  const activePane = selected || composeTarget;

  if (loading) return <InboxSkeleton />;
  if (error) return <ErrorState onRetry={loadConversations} />;
  if (conversations.length === 0 && !composeTarget) return <EmptyState />;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className={cn("space-y-2 md:col-span-1", activePane ? "hidden md:block" : "")}>
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
                <div className="flex items-center gap-2 truncate font-semibold text-[--color-text-primary]">
                  {conversation.participant.first_name} {conversation.participant.last_name}
                  {conversation.unread_count > 0 ? (
                    <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                      {conversation.unread_count}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[--color-text-muted]">{conversation.last_message.body}</p>
                {conversation.shared_courses.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {conversation.shared_courses.map((course) => (
                      <span
                        key={course.id}
                        title={course.title}
                        className="inline-flex max-w-[140px] items-center truncate rounded-full border border-[--color-primary]/20 bg-[--color-primary-subtle] px-2 py-0.5 text-[10px] font-semibold text-[--color-primary] transition-all duration-200 hover:max-w-none hover:scale-105 hover:border-[--color-primary]/40 hover:shadow-[var(--shadow-sm)]"
                      >
                        {course.title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
        {conversations.length === 0 ? (
          <p className="px-1 text-xs text-[--color-text-muted]">No conversations yet — send your first message.</p>
        ) : null}
      </div>

      <div className={cn("md:col-span-2", activePane ? "" : "hidden md:block")}>
        {!activePane ? (
          <div className="premium-card flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-[--radius-lg] p-6 text-center">
            <MessageSquare className="h-10 w-10 text-[--color-text-muted]" />
            <p className="font-extrabold text-[--color-text-secondary]">Select a conversation</p>
          </div>
        ) : selected ? (
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
        ) : (
          <div className="premium-card flex h-full flex-col rounded-[--radius-lg] p-4">
            <div className="flex items-center gap-3 border-b border-[--color-border] pb-3">
              <button onClick={() => setComposeTarget(null)} className="md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="h-5 w-5 text-[--color-text-secondary]" />
              </button>
              <Avatar className="h-9 w-9">
                <AvatarFallback>{getInitials(composeTarget!.name)}</AvatarFallback>
              </Avatar>
              <p className="font-extrabold text-[--color-text-primary]">{composeTarget!.name}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              <p className="text-sm text-[--color-text-secondary]">
                Send your first message to start the conversation.
              </p>
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
  );
}

export default function InstructorDirectMessagesPage() {
  return (
    <Suspense fallback={null}>
      <InstructorDirectMessagesContent />
    </Suspense>
  );
}
