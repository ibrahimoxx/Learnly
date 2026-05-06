"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

interface Props {
  courseId: string;
  isFree: boolean;
}

export function EnrollButton({ courseId, isFree }: Props) {
  const { isSignedIn, getToken } = useAuth();
  const { openSignIn } = useSignIn() ?? {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    if (!isSignedIn) {
      openSignIn?.();
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const enrollment = await apiFetch<Enrollment>("/api/v1/enrollments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ course_id: courseId }),
      });
      toast.success("Enrolled successfully!");
      router.push(`/learn/${courseId}/${enrollment.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      if (msg.includes("409")) {
        router.push("/dashboard");
      } else if (msg.includes("402")) {
        toast.error("This is a paid course. Checkout coming soon.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className="mt-4 w-full text-sm font-semibold"
      size="lg"
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? "Processing…" : isFree ? "Enroll for free" : "Buy now"}
    </Button>
  );
}
