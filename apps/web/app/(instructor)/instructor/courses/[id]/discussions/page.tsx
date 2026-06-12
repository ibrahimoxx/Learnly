"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronLeft, Pin, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { DiscussionPost } from "@/types";
import { Badge } from "@/components/ui/badge";

export default function CourseDiscussionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DiscussionPost[]>(`/api/v1/courses/${id}/discussions`);
      setPosts(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("403")) {
        router.push("/instructor/courses");
        return;
      }
      toast.error("Failed to load discussions.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function togglePin(postId: string) {
    setActionId(postId);
    const token = await getToken();
    try {
      const updated = await apiFetch<DiscussionPost>(`/api/v1/discussions/${postId}/pin`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      toast.success(updated.is_pinned ? "Post pinned." : "Post unpinned.");
    } catch {
      toast.error("Failed to update pin.");
    } finally {
      setActionId(null);
    }
  }

  async function deletePost(postId: string) {
    setActionId(postId);
    const token = await getToken();
    try {
      await apiFetch(`/api/v1/discussions/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted.");
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/instructor/courses/${id}/edit`}
          className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[--color-text-primary]">Discussions</h1>
          <p className="text-sm text-[--color-text-muted] mt-0.5">
            Moderate student discussions — pin important posts or remove off-topic ones.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[--radius-md] bg-[--color-surface] animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="premium-card flex flex-col items-center gap-3 rounded-[--radius-md] py-14 text-center">
          <MessageSquare className="h-10 w-10 text-[--color-border]" />
          <p className="text-sm text-[--color-text-muted]">No discussions yet for this course.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="hover-lift premium-card rounded-[--radius-md] px-5 py-4"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[--color-primary-subtle] text-sm font-bold text-[--brand-800]">
                  {post.author_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[--color-text-primary] leading-snug">
                      {post.title}
                    </p>
                    {post.is_pinned && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Pin className="h-3 w-3" /> Pinned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[--color-text-muted] mt-0.5">
                    {post.author_name} · {new Date(post.created_at).toLocaleDateString()} ·{" "}
                    {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
                  </p>
                  <p className="text-sm text-[--color-text-secondary] leading-relaxed mt-2 line-clamp-2">
                    {post.body}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => togglePin(post.id)}
                    disabled={actionId === post.id}
                    title={post.is_pinned ? "Unpin" : "Pin"}
                    className={`rounded p-2 transition-colors disabled:opacity-40 ${
                      post.is_pinned
                        ? "text-[--color-primary] hover:bg-[--color-primary]/10"
                        : "text-[--color-text-muted] hover:text-[--color-primary] hover:bg-[--color-primary]/10"
                    }`}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={actionId === post.id}
                    title="Delete post"
                    className="rounded p-2 text-[--color-text-muted] hover:text-[--color-error] hover:bg-[--color-error]/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
