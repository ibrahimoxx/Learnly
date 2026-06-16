"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, PlayCircle, FileText, ChevronLeft, ChevronRight,
  MessageCircle, BookOpen, ChevronDown, ChevronUp, Send, HelpCircle,
  MessagesSquare, Lock, Code, StickyNote, Pencil, Trash2, ClipboardList,
  ArrowLeft, SkipForward, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Enrollment, Lesson, LessonProgress, Section, Question, LiveSession, Note } from "@/types";
import { QuizPlayer } from "@/components/features/quiz/quiz-player";
import { CodingExercisePlayer } from "@/components/features/coding/coding-exercise-player";
import { AssignmentSubmissionPlayer } from "@/components/features/assignments/assignment-submission-player";
import { LiveRoom } from "@/components/features/live/live-room";
import DiscussionSection from "@/components/features/courses/discussion-section";

interface SectionWithLessons extends Section {
  lessons: Lesson[];
}

interface Props {
  enrollment: Enrollment;
  sectionsWithLessons: SectionWithLessons[];
  currentLesson: Lesson;
  token: string;
  initialProgress: LessonProgress[];
}

type SidebarTab = "content" | "qa" | "forums" | "notes";

interface ProgressSSEEvent {
  lesson_id: string;
  is_completed: boolean;
  watched_seconds: number;
  last_position_seconds: number;
  completed_at: string | null;
}

export function PlayerClient({ enrollment, sectionsWithLessons, currentLesson, token: _serverToken, initialProgress }: Props) {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => (await getToken()) ?? _serverToken, [getToken, _serverToken]);
  const router = useRouter();
  const posthog = usePostHog();
  const progressRef = useRef<number>(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("content");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<SidebarTab>("content");
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(initialProgress.filter((p) => p.is_completed).map((p) => p.lesson_id))
  );
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    async function pollLiveSessions() {
      try {
        const tok = await getAuthToken();
        const sessions = await apiFetch<LiveSession[]>(
          `/api/v1/courses/${enrollment.course_id}/live-sessions`,
          { headers: { Authorization: `Bearer ${tok}` } }
        );
        setLiveSession(sessions.find((s) => s.status === "live") ?? null);
      } catch {/* non-critical */}
    }
    pollLiveSessions();
    const interval = setInterval(pollLiveSessions, 30_000);
    return () => clearInterval(interval);
  }, [enrollment.course_id, getAuthToken]);

  const allLessons = sectionsWithLessons.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = allLessons[currentIndex + 1] ?? null;
  const prevLesson = allLessons[currentIndex - 1] ?? null;
  const totalLessons = allLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const saveProgress = useCallback(
    async (watched: number, position: number, completed: boolean) => {
      try {
        const tok = await getAuthToken();
        await apiFetch(`/api/v1/enrollments/${enrollment.id}/progress`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
          body: JSON.stringify({
            lesson_id: currentLesson.id,
            watched_seconds: watched,
            last_position_seconds: position,
            is_completed: completed,
          }),
        });
        if (completed) {
          setCompletedIds((prev) => {
            if (prev.has(currentLesson.id)) return prev;
            toast.success("Lesson complete! +10 XP", { duration: 3000 });
            posthog?.capture("lesson_completed", { lesson_id: currentLesson.id, course_id: enrollment.course_id });
            return new Set([...prev, currentLesson.id]);
          });
        }
      } catch {/* silent */}
    },
    [enrollment.id, currentLesson.id, getAuthToken]
  );

  useEffect(() => {
    let retries = 0;
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    function connect() {
      es = new EventSource(`/api/sse/${enrollment.id}`);
      es.onmessage = (evt: MessageEvent<string>) => {
        retries = 0;
        try {
          const data = JSON.parse(evt.data) as ProgressSSEEvent;
          if (data.is_completed) setCompletedIds((prev) => new Set([...prev, data.lesson_id]));
        } catch {/* ignore */}
      };
      es.onerror = () => {
        es?.close();
        if (retries < 3) { reconnectTimeout = setTimeout(connect, Math.pow(2, retries) * 2000); retries++; }
      };
    }
    connect();
    return () => { es?.close(); if (reconnectTimeout) clearTimeout(reconnectTimeout); };
  }, [enrollment.id]);

  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      if (progressRef.current > 0) saveProgress(progressRef.current, progressRef.current, false);
    }, 10_000);
    return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); };
  }, [saveProgress]);

  function handleTimeUpdate(currentTime: number, duration: number) {
    progressRef.current = currentTime;
    if (duration > 0 && currentTime / duration >= 0.9) saveProgress(Math.floor(currentTime), Math.floor(currentTime), true);
  }

  function navigateTo(lessonId: string) {
    router.push(`/learn/${enrollment.course_id}/${lessonId}`);
  }

  const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: "content", label: "Content", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "notes", label: "Notes", icon: <StickyNote className="h-3.5 w-3.5" /> },
    { id: "qa", label: "Q&A", icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { id: "forums", label: "Forums", icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "#0a0a0f", color: "#e2e8f0" }}>

      {/* ── Top bar ── */}
      <header
        className="flex h-13 shrink-0 items-center gap-3 px-4 shadow-lg"
        style={{ background: "#111118", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My Learning
        </Link>

        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>

        <span className="flex-1 truncate text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          {currentLesson.title}
        </span>

        {/* Progress pill */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <div className="h-1.5 w-28 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "var(--color-primary)" }}
            />
          </div>
          <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
            {completedCount}/{totalLessons}
          </span>
        </div>

        {liveSession && (
          <button
            onClick={() => setShowLiveRoom(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-all"
            style={{ background: "#dc2626", boxShadow: "0 0 12px rgba(220,38,38,0.4)" }}
          >
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT sidebar ── */}
        <aside
          className="hidden shrink-0 flex-col overflow-hidden lg:flex transition-all duration-300"
          style={{
            width: sidebarCollapsed ? "0px" : "300px",
            background: "#111118",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Tab bar */}
          <div
            className="flex shrink-0 text-[11px]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.35)",
                  borderBottom: activeTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "content" ? (
              <ContentTab
                sectionsWithLessons={sectionsWithLessons}
                currentLessonId={currentLesson.id}
                onNavigate={navigateTo}
                completedIds={completedIds}
              />
            ) : activeTab === "notes" ? (
              <NotesTab lessonId={currentLesson.id} token={_serverToken} progressRef={progressRef} />
            ) : activeTab === "qa" ? (
              <QATab lessonId={currentLesson.id} token={_serverToken} />
            ) : (
              <DiscussionSection courseId={enrollment.course_id} theme="dark" />
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Sidebar toggle + lesson type badge */}
          <div
            className="hidden shrink-0 items-center gap-3 px-4 py-2 lg:flex"
            style={{ background: "#0d0d14", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              {sidebarCollapsed ? "Show" : "Hide"} sidebar
            </button>

            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "rgba(124,58,237,0.15)",
                color: "rgba(167,139,250,0.9)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              {currentLesson.type === "coding_exercise" ? "Coding" : currentLesson.type}
            </span>

            {prevLesson && (
              <button
                onClick={() => navigateTo(prevLesson.id)}
                className="ml-auto flex items-center gap-1 text-[11px] font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
            )}
          </div>

          {/* ── Video / lesson content ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentLesson.type === "video" ? (
              <div className="flex-1 bg-black flex items-center justify-center">
                {currentLesson.video_url ? (
                  <div className="relative w-full h-full">
                    {currentLesson.video_url.includes("youtube.com/embed") ? (
                      <iframe
                        key={currentLesson.id}
                        src={currentLesson.video_url}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        key={currentLesson.id}
                        src={currentLesson.video_url}
                        controls
                        className="h-full w-full"
                        onTimeUpdate={(e) => {
                          const v = e.currentTarget;
                          handleTimeUpdate(v.currentTime, v.duration);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full"
                      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      <PlayCircle className="h-10 w-10" style={{ color: "rgba(167,139,250,0.7)" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Video not yet available
                    </p>
                  </div>
                )}
              </div>
            ) : currentLesson.type === "quiz" ? (
              <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d14" }}>
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }}>{currentLesson.title}</h2>
                  <Link
                    href={`/learn/${enrollment.course_id}/${currentLesson.id}/quiz`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{ background: "rgba(124,58,237,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(124,58,237,0.25)" }}
                  >
                    Full screen
                  </Link>
                </div>
                <QuizPlayer lessonId={currentLesson.id} token={_serverToken} />
              </div>
            ) : currentLesson.type === "coding_exercise" ? (
              <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d14" }}>
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }}>{currentLesson.title}</h2>
                  <Link
                    href={`/learn/${enrollment.course_id}/${currentLesson.id}/coding-exercise`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{ background: "rgba(124,58,237,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(124,58,237,0.25)" }}
                  >
                    Full screen
                  </Link>
                </div>
                <CodingExercisePlayer lessonId={currentLesson.id} token={_serverToken} />
              </div>
            ) : currentLesson.type === "assignment" ? (
              <div className="flex-1 overflow-y-auto" style={{ background: "#0d0d14" }}>
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }}>{currentLesson.title}</h2>
                  <Link
                    href={`/learn/${enrollment.course_id}/${currentLesson.id}/assignment`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{ background: "rgba(124,58,237,0.15)", color: "rgba(167,139,250,0.9)", border: "1px solid rgba(124,58,237,0.25)" }}
                  >
                    Full screen
                  </Link>
                </div>
                <AssignmentSubmissionPlayer lessonId={currentLesson.id} token={_serverToken} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-8 py-8" style={{ background: "#0d0d14" }}>
                <div className="mx-auto max-w-2xl">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(124,58,237,0.15)", color: "rgba(167,139,250,0.8)", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    Article
                  </span>
                  <h2 className="mt-4 text-2xl font-black tracking-tight" style={{ color: "#f1f5f9" }}>
                    {currentLesson.title}
                  </h2>
                  <div className="mt-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                  {currentLesson.content ? (
                    <div className="mt-6 text-sm leading-7 whitespace-pre-wrap" style={{ color: "rgba(226,232,240,0.75)" }}>
                      {currentLesson.content}
                    </div>
                  ) : (
                    <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Content coming soon.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Next lesson bar ── */}
          {nextLesson && (
            <div
              className="shrink-0 flex items-center gap-4 px-5 py-3"
              style={{ background: "#111118", borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <SkipForward className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Up next</p>
                <p className="truncate text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{nextLesson.title}</p>
              </div>
              <button
                onClick={() => navigateTo(nextLesson.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                style={{ background: "var(--color-primary)", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex"
        style={{ background: "#111118", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setMobileTab(tab.id); setMobileDrawerOpen(true); }}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Mobile drawer ── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <div
            className="relative flex flex-col overflow-hidden rounded-t-2xl"
            style={{ height: "75dvh", background: "#111118", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex gap-4">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMobileTab(tab.id)}
                    className="text-xs font-medium transition-colors pb-0.5"
                    style={{
                      color: mobileTab === tab.id ? "white" : "rgba(255,255,255,0.35)",
                      borderBottom: mobileTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="text-lg leading-none"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mobileTab === "content" ? (
                <ContentTab
                  sectionsWithLessons={sectionsWithLessons}
                  currentLessonId={currentLesson.id}
                  onNavigate={(id) => { setMobileDrawerOpen(false); navigateTo(id); }}
                  completedIds={completedIds}
                />
              ) : mobileTab === "notes" ? (
                <NotesTab lessonId={currentLesson.id} token={_serverToken} progressRef={progressRef} />
              ) : mobileTab === "qa" ? (
                <QATab lessonId={currentLesson.id} token={_serverToken} />
              ) : (
                <DiscussionSection courseId={enrollment.course_id} theme="dark" />
              )}
            </div>
          </div>
        </div>
      )}

      {showLiveRoom && liveSession && (
        <LiveRoom sessionId={liveSession.id} getToken={getAuthToken} onClose={() => setShowLiveRoom(false)} />
      )}
    </div>
  );
}

/* ─────────────────── ContentTab ─────────────────── */

function ContentTab({
  sectionsWithLessons,
  currentLessonId,
  onNavigate,
  completedIds,
}: {
  sectionsWithLessons: SectionWithLessons[];
  currentLessonId: string;
  onNavigate: (id: string) => void;
  completedIds: Set<string>;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const typeIcon: Record<string, React.ReactNode> = {
    video: <PlayCircle className="h-3.5 w-3.5" />,
    article: <FileText className="h-3.5 w-3.5" />,
    quiz: <HelpCircle className="h-3.5 w-3.5" />,
    coding_exercise: <Code className="h-3.5 w-3.5" />,
    assignment: <ClipboardList className="h-3.5 w-3.5" />,
  };

  return (
    <div className="pb-4">
      {sectionsWithLessons.map((section) => {
        const isOpen = !collapsed.has(section.id);
        const sectionCompleted = section.lessons.filter((l) => completedIds.has(l.id)).length;

        return (
          <div key={section.id}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold leading-snug" style={{ color: "#e2e8f0" }}>
                  {section.title}
                </p>
                <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {sectionCompleted}/{section.lessons.length} completed
                </p>
              </div>
              {isOpen
                ? <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                : <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              }
            </button>

            {/* Lessons */}
            {isOpen && (
              <ul>
                {section.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isDone = completedIds.has(lesson.id);
                  const isLocked = !!(lesson.unlock_at && new Date() < new Date(lesson.unlock_at));

                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => !isLocked && onNavigate(lesson.id)}
                        disabled={isLocked}
                        className="flex w-full items-start gap-3 px-4 py-2.5 text-left text-xs transition-all"
                        style={{
                          background: isCurrent
                            ? "rgba(124,58,237,0.18)"
                            : "transparent",
                          borderLeft: isCurrent
                            ? "2px solid var(--color-primary)"
                            : "2px solid transparent",
                          opacity: isLocked ? 0.4 : 1,
                          cursor: isLocked ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent && !isLocked) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* Icon */}
                        <span
                          className="mt-0.5 shrink-0"
                          style={{
                            color: isLocked
                              ? "rgba(255,255,255,0.2)"
                              : isDone
                                ? "#22c55e"
                                : isCurrent
                                  ? "rgb(167,139,250)"
                                  : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isCurrent ? (
                            <PlayCircle className="h-3.5 w-3.5" />
                          ) : (
                            (typeIcon[lesson.type] ?? <Circle className="h-3.5 w-3.5" />)
                          )}
                        </span>

                        {/* Text */}
                        <span className="flex flex-col gap-0.5">
                          <span
                            className="leading-snug text-[11px]"
                            style={{
                              color: isCurrent
                                ? "#f8fafc"
                                : isDone
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(255,255,255,0.65)",
                              fontWeight: isCurrent ? 600 : 400,
                              textDecoration: isDone && !isCurrent ? "line-through" : "none",
                            }}
                          >
                            {lesson.title}
                          </span>
                          {isLocked && lesson.unlock_at && (
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                              Unlocks {new Date(lesson.unlock_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── NotesTab ─────────────────── */

function formatTimestamp(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function NotesTab({ lessonId, token, progressRef }: { lessonId: string; token: string; progressRef: React.RefObject<number> }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<Note[]>(`/api/v1/lessons/${lessonId}/notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(setNotes).catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [lessonId, token]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      const note = await apiFetch<Note>(`/api/v1/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim(), timestamp_seconds: Math.floor(progressRef.current) }),
      });
      setNotes((prev) => [...prev, note]);
      setNewNote("");
    } catch { toast.error("Failed to save note."); }
    finally { setSubmitting(false); }
  }

  async function saveEdit(noteId: string) {
    if (!editText.trim()) return;
    try {
      const updated = await apiFetch<Note>(`/api/v1/notes/${noteId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
    } catch { toast.error("Failed to update note."); }
  }

  async function deleteNote(noteId: string) {
    try {
      await apiFetch(`/api/v1/notes/${noteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch { toast.error("Failed to delete note."); }
  }

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-14 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <form
        onSubmit={submitNote}
        className="shrink-0 p-3 space-y-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Note at current timestamp…"
          rows={3}
          className="w-full resize-none rounded-lg px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none focus:ring-1"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <button
          type="submit"
          disabled={submitting || !newNote.trim()}
          className="w-full rounded-lg py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-all"
          style={{ background: "var(--color-primary)" }}
        >
          Save at {formatTimestamp(Math.floor(progressRef.current))}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <StickyNote className="h-7 w-7" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No notes for this lesson yet.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="px-3 py-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(note.id)} disabled={!editText.trim()} className="rounded-md px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-40" style={{ background: "var(--color-primary)" }}>Save</button>
                    <button onClick={() => setEditingId(null)} className="rounded-md px-2.5 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {note.timestamp_seconds !== null && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-mono" style={{ background: "rgba(124,58,237,0.2)", color: "rgba(167,139,250,0.9)" }}>
                        {formatTimestamp(note.timestamp_seconds)}
                      </span>
                    )}
                    <div className="flex gap-1.5 ml-auto">
                      <button onClick={() => { setEditingId(note.id); setEditText(note.content); }} style={{ color: "rgba(255,255,255,0.3)" }} className="transition-colors hover:opacity-80"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => deleteNote(note.id)} style={{ color: "rgba(255,255,255,0.3)" }} className="transition-colors hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-snug whitespace-pre-wrap" style={{ color: "rgba(226,232,240,0.75)" }}>{note.content}</p>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────────────── QATab ─────────────────── */

function QATab({ lessonId, token }: { lessonId: string; token: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Question[]>(`/api/v1/lessons/${lessonId}/questions`)
      .then(setQuestions).catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [lessonId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const q = await apiFetch<Question>(`/api/v1/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: newQuestion.trim() }),
      });
      setQuestions((prev) => [q, ...prev]);
      setNewQuestion("");
    } catch { setSubmitError("Failed to post. Please try again."); }
    finally { setSubmitting(false); }
  }

  async function submitAnswer(questionId: string) {
    const body = replyTexts[questionId]?.trim();
    if (!body) return;
    try {
      const a = await apiFetch(`/api/v1/questions/${questionId}/answers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setQuestions((prev) => prev.map((q) => q.id === questionId ? { ...q, answers: [...q.answers, a as Question["answers"][number]] } : q));
      setReplyTexts((prev) => ({ ...prev, [questionId]: "" }));
      setReplyingTo(null);
    } catch {/* non-critical */}
  }

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-14 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={submitQuestion} className="shrink-0 p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask about this lesson…"
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none focus:ring-1"
            style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="shrink-0 rounded-lg p-2 text-white disabled:opacity-40 transition-all"
            style={{ background: "var(--color-primary)" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {submitError && <p className="mt-1 text-[10px]" style={{ color: "#f87171" }}>{submitError}</p>}
      </form>

      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <MessageCircle className="h-7 w-7" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>No questions yet. Ask the first one!</p>
          </div>
        ) : (
          questions.map((q) => {
            const expanded = expandedIds.has(q.id);
            return (
              <div key={q.id} className="px-3 py-3">
                <div className="flex items-start gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(124,58,237,0.25)", color: "rgba(167,139,250,0.9)" }}
                  >
                    {q.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{q.student_name}</p>
                    <p className="mt-0.5 text-xs leading-snug" style={{ color: "rgba(226,232,240,0.8)" }}>{q.body}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="flex items-center gap-0.5 text-[10px] transition-colors"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {q.answers.length} answer{q.answers.length !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)}
                        className="text-[10px] transition-colors"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && q.answers.length > 0 && (
                  <div className="mt-2 ml-8 space-y-2">
                    {q.answers.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                          {a.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{a.user_name}</p>
                          <p className="mt-0.5 text-xs leading-snug" style={{ color: "rgba(226,232,240,0.65)" }}>{a.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {replyingTo === q.id && (
                  <div className="mt-2 ml-8 flex gap-2">
                    <input
                      value={replyTexts[q.id] ?? ""}
                      onChange={(e) => setReplyTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write a reply…"
                      className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs placeholder:opacity-30 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                    <button
                      onClick={() => submitAnswer(q.id)}
                      disabled={!replyTexts[q.id]?.trim()}
                      className="shrink-0 rounded-lg p-1.5 text-white disabled:opacity-40"
                      style={{ background: "var(--color-primary)" }}
                    >
                      <Send className="h-3 w-3" />
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
