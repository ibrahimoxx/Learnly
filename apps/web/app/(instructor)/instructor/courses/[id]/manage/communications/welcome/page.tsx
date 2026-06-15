"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

export default function CourseWelcomeMessagePage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const course = await apiFetch<Course>(`/api/v1/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWelcomeMessage(course.welcome_message ?? "");
      setCompletionMessage(course.completion_message ?? "");
    } catch {
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const token = await getToken();
    setSaving(true);
    try {
      await apiFetch<Course>(`/api/v1/courses/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          welcome_message: welcomeMessage.trim() || null,
          completion_message: completionMessage.trim() || null,
        }),
      });
      toast.success("Messages saved.");
    } catch {
      toast.error("Failed to save messages.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Welcome Message</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Sent automatically to students when they enroll in your course.
        </p>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={5}
          placeholder="Welcome! I'm excited to have you in this course..."
          className="mt-4 w-full resize-none rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
        />
      </div>

      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Congratulations Message</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Sent automatically to students when they complete your course.
        </p>
        <textarea
          value={completionMessage}
          onChange={(e) => setCompletionMessage(e.target.value)}
          rows={5}
          placeholder="Congratulations on finishing the course! Here's what to do next..."
          className="mt-4 w-full resize-none rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
        />
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/pricing`}>
          <Button variant="outline" size="sm">Back: Pricing</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/instructor/courses/${id}/manage/co-instructors`}>
            <Button variant="outline" size="sm">Next: Co-Instructors</Button>
          </Link>
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? "Saving…" : "Save messages"}
          </Button>
        </div>
      </div>
    </div>
  );
}
