"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { ChevronLeft, Plus, Radio, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import type { LiveSession } from "@/types";
import { LiveRoom } from "@/components/features/live/live-room";

const STATUS_BADGE: Record<LiveSession["status"], "default" | "success" | "secondary" | "destructive"> = {
  scheduled: "secondary",
  live: "success",
  ended: "default",
};

export default function InstructorLivePage() {
  const { id: courseId } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    setAuthToken(token);
    try {
      const data = await apiFetch<LiveSession[]>(
        `/api/v1/courses/${courseId}/live-sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(data);
    } catch {
      toast.error("Failed to load live sessions.");
    } finally {
      setLoading(false);
    }
  }, [courseId, getToken]);

  useEffect(() => { load(); }, [load]);

  async function createSession() {
    if (!newTitle.trim()) return;
    const token = await getToken();
    setCreating(true);
    try {
      const session = await apiFetch<LiveSession>(
        `/api/v1/courses/${courseId}/live-sessions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle.trim(),
            scheduled_at: newScheduledAt ? new Date(newScheduledAt).toISOString() : null,
          }),
        }
      );
      setSessions((prev) => [session, ...prev]);
      setNewTitle("");
      setNewScheduledAt("");
      toast.success("Session created.");
    } catch {
      toast.error("Failed to create session.");
    } finally {
      setCreating(false);
    }
  }

  async function startSession(sessionId: string) {
    const token = await getToken();
    try {
      const updated = await apiFetch<LiveSession>(
        `/api/v1/live-sessions/${sessionId}/start`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
      toast.success("Session started!");
    } catch {
      toast.error("Failed to start session.");
    }
  }

  async function endSession(sessionId: string) {
    const token = await getToken();
    try {
      const updated = await apiFetch<LiveSession>(
        `/api/v1/live-sessions/${sessionId}/end`,
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
      if (activeRoom === sessionId) setActiveRoom(null);
      toast.success("Session ended.");
    } catch {
      toast.error("Failed to end session.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/instructor/courses/${courseId}/edit`} className="text-[--color-text-muted] hover:text-[--color-text-primary]">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[--color-text-primary]">Live Sessions</h1>
      </div>

      {/* Create session form */}
      <div className="rounded-[--radius-md] border border-[--color-border] bg-white p-5 mb-6">
        <h2 className="text-sm font-semibold text-[--color-text-primary] mb-3">New Session</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Session title (e.g. Q&A Session)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1"
          />
          <input
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
            className="rounded border border-[--color-border] bg-white px-3 py-2 text-sm text-[--color-text-secondary] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
          />
          <Button onClick={createSession} disabled={creating || !newTitle.trim()} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="rounded-[--radius-md] border border-dashed border-[--color-border] bg-white py-12 text-center">
          <Radio className="mx-auto h-8 w-8 text-[--color-text-muted] mb-3" />
          <p className="text-sm text-[--color-text-muted]">No live sessions yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-[--radius-md] border border-[--color-border] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[--color-text-primary] truncate">{session.title}</h3>
                    <Badge variant={STATUS_BADGE[session.status]}>{session.status}</Badge>
                    {session.status === "live" && (
                      <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[--color-text-muted]">
                    {session.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Scheduled: {new Date(session.scheduled_at).toLocaleString()}
                      </span>
                    )}
                    {session.started_at && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Started: {new Date(session.started_at).toLocaleString()}
                      </span>
                    )}
                    {session.ended_at && (
                      <span className="flex items-center gap-1 text-[--color-text-muted]">
                        <XCircle className="h-3.5 w-3.5" />
                        Ended: {new Date(session.ended_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {session.status === "scheduled" && (
                    <Button onClick={() => startSession(session.id)} size="sm" variant="default">
                      Start
                    </Button>
                  )}
                  {session.status === "live" && (
                    <>
                      <Button
                        onClick={() => setActiveRoom(activeRoom === session.id ? null : session.id)}
                        size="sm"
                        variant="outline"
                      >
                        {activeRoom === session.id ? "Leave" : "Join"}
                      </Button>
                      <Button onClick={() => endSession(session.id)} size="sm" variant="destructive">
                        End
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeRoom && authToken && (
        <LiveRoom
          sessionId={activeRoom}
          token={authToken}
          onClose={() => setActiveRoom(null)}
        />
      )}
    </div>
  );
}
