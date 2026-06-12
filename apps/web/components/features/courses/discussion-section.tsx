"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, ChevronUp, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { DiscussionPost, DiscussionReply } from "@/types";

interface Props {
  courseId: string;
  theme?: "dark" | "light";
}

export default function DiscussionSection({ courseId, theme = "light" }: Props) {
  const { getToken, isSignedIn } = useAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const dark = theme === "dark";

  useEffect(() => {
    setLoading(true);
    apiFetch<DiscussionPost[]>(`/api/v1/courses/${courseId}/discussions`)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setPostError(null);
    const token = await getToken();
    try {
      const post = await apiFetch<DiscussionPost>(`/api/v1/courses/${courseId}/discussions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setPosts((prev) => [post, ...prev]);
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post";
      setPostError(msg.includes("403") || msg.toLowerCase().includes("enrolled")
        ? "You must be enrolled in this course to post."
        : "Failed to post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply(postId: string) {
    if (!isSignedIn) return;
    const replyBody = replyTexts[postId]?.trim();
    if (!replyBody) return;
    const token = await getToken();
    try {
      const reply = await apiFetch<DiscussionReply>(`/api/v1/discussions/${postId}/replies`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p))
      );
      setReplyTexts((prev) => ({ ...prev, [postId]: "" }));
      setReplyingTo(null);
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className={`h-16 rounded animate-pulse ${dark ? "bg-white/5" : "bg-[--color-surface]"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={dark ? "flex flex-col h-full" : ""}>
      {/* Create post */}
      <div className={`shrink-0 p-3 border-b ${dark ? "border-white/10" : "border-[--color-border]"}`}>
        {!isSignedIn ? (
          <p className={`text-sm ${dark ? "text-white/40" : "text-[--color-text-muted]"}`}>
            <Link href="/sign-in" className="text-[--color-primary] hover:underline">
              Sign in
            </Link>{" "}
            to participate in discussions.
          </p>
        ) : showForm ? (
          <form onSubmit={submitPost} className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Discussion title…"
              maxLength={200}
              className={
                dark
                  ? "w-full rounded bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
                  : "w-full rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              }
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={dark ? 3 : 4}
              maxLength={5000}
              className={
                dark
                  ? "w-full rounded bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[--color-primary] resize-none"
                  : "w-full resize-none rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
              }
            />
            {postError && (
              <p className="text-xs text-[--color-error]">{postError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setPostError(null); }}
                className={`text-xs transition-colors ${
                  dark
                    ? "text-white/40 hover:text-white/70"
                    : "text-[--color-text-muted] hover:text-[--color-text-primary]"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !body.trim()}
                className="rounded bg-[--color-primary] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[--color-primary-hover] transition-colors"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className={
              dark
                ? "w-full rounded bg-white/5 px-2.5 py-1.5 text-left text-xs text-white/30 hover:bg-white/10 hover:text-white/50 transition-colors"
                : "w-full rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface] px-3 py-2.5 text-left text-sm text-[--color-text-muted] hover:border-[--color-primary]/50 hover:bg-[--color-surface-raised] transition-colors"
            }
          >
            Start a discussion…
          </button>
        )}
      </div>

      {/* Posts */}
      <div
        className={`${dark ? "flex-1 overflow-y-auto" : ""} divide-y ${
          dark ? "divide-white/5" : "divide-[--color-border]"
        }`}
      >
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
            <MessagesSquare
              className={`h-10 w-10 ${dark ? "text-white/20" : "text-[--color-border]"}`}
            />
            <p className={`text-sm ${dark ? "text-white/30" : "text-[--color-text-muted]"}`}>
              No discussions yet. Start one!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const expanded = expandedIds.has(post.id);
            return (
              <div key={post.id} className={dark ? "px-3 py-3" : "py-6"}>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[--color-primary] ${
                      dark ? "bg-[--color-primary]/20" : "bg-[--color-primary-subtle]"
                    }`}
                  >
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`font-semibold leading-snug ${
                          dark
                            ? "text-xs text-white/90"
                            : "text-sm text-[--color-text-primary]"
                        }`}
                      >
                        {post.title}
                      </p>
                      {post.is_pinned && <span className="text-xs">📌</span>}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        dark ? "text-white/40" : "text-[--color-text-muted]"
                      }`}
                    >
                      {post.author_name} · {new Date(post.created_at).toLocaleDateString()}
                    </p>
                    <p
                      className={`leading-relaxed mt-1.5 ${
                        dark
                          ? "text-xs text-white/70 line-clamp-2"
                          : "text-sm text-[--color-text-secondary]"
                      }`}
                    >
                      {post.body}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <button
                        onClick={() => toggleExpand(post.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          dark
                            ? "text-white/40 hover:text-white/70"
                            : "text-[--color-text-muted] hover:text-[--color-primary]"
                        }`}
                      >
                        {expanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
                      </button>
                      {isSignedIn && (
                        <button
                          onClick={() =>
                            setReplyingTo(replyingTo === post.id ? null : post.id)
                          }
                          className={`text-xs transition-colors ${
                            dark
                              ? "text-white/40 hover:text-white/70"
                              : "text-[--color-text-muted] hover:text-[--color-primary]"
                          }`}
                        >
                          Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expanded && post.replies.length > 0 && (
                  <div className="mt-3 ml-11 space-y-3">
                    {post.replies.map((r) => (
                      <div key={r.id} className="flex items-start gap-2">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            dark
                              ? "bg-white/10 text-white/60"
                              : "bg-[--color-surface] text-[--color-text-muted]"
                          }`}
                        >
                          {r.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs ${
                              dark ? "text-white/30" : "text-[--color-text-muted]"
                            }`}
                          >
                            {r.author_name}
                          </p>
                          <p
                            className={`text-sm leading-relaxed mt-0.5 ${
                              dark ? "text-white/70" : "text-[--color-text-secondary]"
                            }`}
                          >
                            {r.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {replyingTo === post.id && (
                  <div className="mt-3 ml-11 flex gap-2">
                    <input
                      value={replyTexts[post.id] ?? ""}
                      onChange={(e) =>
                        setReplyTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Write a reply…"
                      className={
                        dark
                          ? "flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[--color-primary] min-w-0"
                          : "flex-1 min-w-0 rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-1.5 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
                      }
                    />
                    <button
                      onClick={() => submitReply(post.id)}
                      disabled={!replyTexts[post.id]?.trim()}
                      className="shrink-0 rounded bg-[--color-primary] p-1.5 text-white disabled:opacity-40 hover:bg-[--color-primary-hover] transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
