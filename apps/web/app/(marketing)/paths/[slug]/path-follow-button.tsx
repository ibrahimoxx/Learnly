"use client";

import { useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { BookmarkPlus, BookmarkCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  slug: string;
  initialEnrolled?: boolean;
}

export function PathFollowButton({ slug, initialEnrolled = false }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-2 rounded-[--radius-sm] border border-[--color-primary] px-4 py-2 text-sm font-semibold text-[--color-primary] hover:bg-[--color-primary]/5 transition-colors">
          <BookmarkPlus className="h-4 w-4" />
          Follow path
        </button>
      </SignInButton>
    );
  }

  async function toggle() {
    setLoading(true);
    try {
      const token = await getToken();
      if (enrolled) {
        await apiFetch(`/api/v1/learning-paths/${slug}/enroll`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnrolled(false);
        toast.success("Unfollowed path");
      } else {
        await apiFetch(`/api/v1/learning-paths/${slug}/enroll`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnrolled(true);
        toast.success("Now following this path!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg.includes("409")) {
        setEnrolled(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-[--radius-sm] border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        enrolled
          ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]"
          : "border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary]/5"
      }`}
    >
      {enrolled ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
      {loading ? "…" : enrolled ? "Following" : "Follow path"}
    </button>
  );
}
