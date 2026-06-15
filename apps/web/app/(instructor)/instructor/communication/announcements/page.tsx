"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import type { AnnouncementRead, Course } from "@/types";

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InstructorAnnouncementsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRead[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const [coursesData, announcementsData] = await Promise.all([
        apiFetch<Course[]>("/api/v1/courses/mine", { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch<AnnouncementRead[]>("/api/v1/instructor/announcements", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setCourses(coursesData);
      setAnnouncements(announcementsData);
      const firstCourse = coursesData[0];
      if (firstCourse) setCourseId((prev) => prev || firstCourse.id);
    } catch {
      toast.error("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    if (!courseId || !title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      const created = await apiFetch<AnnouncementRead>(`/api/v1/instructor/announcements/${courseId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setAnnouncements((prev) => [created, ...prev]);
      setTitle("");
      setBody("");
      toast.success(`Announcement sent to ${created.recipient_count} student${created.recipient_count === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Failed to send announcement.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  if (courses.length === 0) {
    return (
      <div className="premium-card rounded-[--radius-lg] p-10 text-center">
        <h2 className="font-semibold text-[--color-text-primary]">No courses yet</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Create a course before sending announcements to students.
        </p>
        <Link
          href="/instructor/courses"
          className="mt-4 inline-flex items-center justify-center rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to My Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="flex items-center gap-2 font-semibold text-[--color-text-primary]">
          <Megaphone className="h-4 w-4 text-[--color-primary]" />
          New announcement
        </h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Sent by email and in-app notification to every enrolled student.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-10 w-full rounded-[--radius-sm] border border-[--color-border] bg-[--color-surface-raised] px-3 text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New section added!" maxLength={200} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">Message</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write your announcement..." maxLength={5000} />
          </div>
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !title.trim() || !body.trim()}>
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send announcement"}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-[--color-text-primary]">Sent announcements</h2>
        {announcements.length === 0 ? (
          <div className="premium-card mt-3 rounded-[--radius-lg] p-10 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-[--color-text-muted]" />
            <p className="mt-2 font-semibold text-[--color-text-primary]">No announcements yet</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Your first announcement will appear here once sent.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="premium-card rounded-[--radius-lg] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[--color-text-primary]">{a.title}</p>
                  <span className="shrink-0 text-xs text-[--color-text-muted]">{formatTime(a.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-[--color-text-secondary]">{a.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[--color-text-muted]">
                  <span>{a.course_title}</span>
                  <span>·</span>
                  <span>{a.recipient_count} recipient{a.recipient_count === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
