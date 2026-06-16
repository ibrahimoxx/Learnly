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
  ArrowLeft, SkipForward, Radio, PanelLeftClose, PanelLeftOpen, Clock,
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

/* Shared palette */
const C = {
  ink: "#08080d",
  panel: "#1a1730",
  panelSolid: "#201c38",
  line: "rgba(255,255,255,0.10)",
  brand: "#8b5cf6",
  brandSoft: "rgba(139,92,246,0.20)",
  brandGlow: "rgba(139,92,246,0.45)",
  txt: "#ffffff",
  txt2: "#c8c4e8",
  txt3: "#8c88a8",
};

const APP_BG =
  "radial-gradient(900px circle at 12% -5%, rgba(139,92,246,0.16), transparent 55%)," +
  "radial-gradient(700px circle at 95% 105%, rgba(56,189,248,0.08), transparent 50%)," +
  C.ink;

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    return null;
  } catch {
    return null;
  }
}

function fmtDuration(sec?: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
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

  const lessonTypeLabel =
    currentLesson.type === "coding_exercise" ? "Coding Exercise"
    : currentLesson.type === "quiz" ? "Quiz"
    : currentLesson.type === "assignment" ? "Assignment"
    : currentLesson.type === "article" ? "Article"
    : "Video";

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: APP_BG, color: C.txt }}>

      {/* ════ Top bar ════ */}
      <header
        className="relative flex h-14 shrink-0 items-center gap-3 px-4"
        style={{ background: "rgba(12,11,18,0.8)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.line}` }}
      >
        <Link
          href="/dashboard"
          className="group flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
          style={{ color: C.txt2, background: "rgba(255,255,255,0.04)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          My Learning
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight" style={{ color: C.txt }}>
            {currentLesson.title}
          </p>
          <p className="truncate text-[11px]" style={{ color: C.txt3 }}>
            {enrollment.course_title ?? "Course"} · {lessonTypeLabel}
          </p>
        </div>

        {liveSession && (
          <button
            onClick={() => setShowLiveRoom(true)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 0 16px rgba(239,68,68,0.5)" }}
          >
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE NOW
          </button>
        )}
      </header>

      {/* ════ Body ════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ LEFT sidebar ════ */}
        <aside
          className="hidden shrink-0 flex-col overflow-hidden lg:flex transition-[width] duration-300 ease-out"
          style={{
            width: sidebarCollapsed ? "0px" : "340px",
            background: C.panel,
            borderRight: `1px solid ${C.line}`,
          }}
        >
          {/* Progress hero */}
          <div className="shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", background: "#1e1a34" }}>
            <div className="flex items-center gap-4">
              <ProgressRing pct={progressPct} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#9d9ab5" }}>
                  Your progress
                </p>
                <p className="mt-0.5 text-lg font-black tracking-tight" style={{ color: "#ffffff" }}>
                  {completedCount}
                  <span className="text-sm font-semibold" style={{ color: "#9d9ab5" }}> / {totalLessons} lessons</span>
                </p>
                <p className="text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
                  {progressPct === 100 ? "Course complete 🎉" : `${progressPct}% done — keep going`}
                </p>
              </div>
            </div>
          </div>

          {/* Segmented tab control */}
          <div className="shrink-0 px-3 pt-3">
            <div className="flex gap-1 rounded-2xl p-1" style={{ background: "#2a2550" }}>
              {TABS.map((tab) => {
                const on = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition-all"
                    style={{
                      color: on ? "#fff" : "#a09cbf",
                      background: on ? "linear-gradient(135deg,rgba(139,92,246,0.9),rgba(124,58,237,0.7))" : "transparent",
                      boxShadow: on ? "0 4px 12px rgba(139,92,246,0.35)" : "none",
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
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

        {/* ════ Main area ════ */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="hidden shrink-0 items-center gap-3 px-5 py-2.5 lg:flex">
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.05)", color: C.txt2 }}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: C.brandSoft, color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              {lessonTypeLabel}
            </span>

            {fmtDuration(currentLesson.duration_seconds) && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: C.txt3 }}>
                <Clock className="h-3 w-3" />
                {fmtDuration(currentLesson.duration_seconds)}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {prevLesson && (
                <button
                  onClick={() => navigateTo(prevLesson.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "rgba(255,255,255,0.05)", color: C.txt2 }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
              )}
              {nextLesson && (
                <button
                  onClick={() => navigateTo(nextLesson.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "rgba(255,255,255,0.05)", color: C.txt2 }}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ════ Content surface ════ */}
          <div className="flex-1 overflow-hidden px-3 pb-3 lg:px-5 lg:pb-4">
            {currentLesson.type === "video" ? (
              <div className="relative h-full w-full">
                {/* ambient glow */}
                <div
                  className="pointer-events-none absolute -inset-2 rounded-3xl opacity-60 blur-2xl"
                  style={{ background: "radial-gradient(circle at 50% 30%, rgba(139,92,246,0.25), transparent 70%)" }}
                />
                <div
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl"
                  style={{ background: "#000", border: `1px solid ${C.line}`, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
                >
                  {currentLesson.video_url ? (() => {
                    const embedUrl = toEmbedUrl(currentLesson.video_url);
                    return embedUrl ? (
                      <iframe
                        key={currentLesson.id}
                        src={embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <video
                        key={currentLesson.id}
                        src={currentLesson.video_url}
                        controls
                        className="h-full w-full"
                        onTimeUpdate={(e) => { const v = e.currentTarget; handleTimeUpdate(v.currentTime, v.duration); }}
                      />
                    );
                  })() : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-2xl"
                        style={{ background: C.brandSoft, border: "1px solid rgba(139,92,246,0.3)", boxShadow: `0 0 30px ${C.brandGlow}` }}
                      >
                        <PlayCircle className="h-9 w-9" style={{ color: "#c4b5fd" }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: C.txt3 }}>Video not yet available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="h-full w-full overflow-y-auto rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.line}` }}
              >
                {currentLesson.type === "quiz" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/quiz`}>
                    <QuizPlayer lessonId={currentLesson.id} token={_serverToken} />
                  </LessonSurface>
                ) : currentLesson.type === "coding_exercise" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/coding-exercise`}>
                    <CodingExercisePlayer lessonId={currentLesson.id} token={_serverToken} />
                  </LessonSurface>
                ) : currentLesson.type === "assignment" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/assignment`}>
                    <AssignmentSubmissionPlayer lessonId={currentLesson.id} token={_serverToken} />
                  </LessonSurface>
                ) : (
                  <article className="mx-auto max-w-2xl px-6 py-8 lg:px-10 lg:py-10">
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: C.brandSoft, color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}
                    >
                      Article
                    </span>
                    <h1 className="mt-4 text-2xl font-black tracking-tight lg:text-3xl" style={{ color: "#f8fafc" }}>
                      {currentLesson.title}
                    </h1>
                    <div className="mt-5 h-px" style={{ background: C.line }} />
                    {currentLesson.content ? (
                      <div className="mt-6 text-[15px] leading-8 whitespace-pre-wrap" style={{ color: C.txt2 }}>
                        {currentLesson.content}
                      </div>
                    ) : (
                      <p className="mt-6 text-sm" style={{ color: C.txt3 }}>Content coming soon.</p>
                    )}
                  </article>
                )}
              </div>
            )}
          </div>

          {/* ════ Next lesson bar ════ */}
          {nextLesson && (
            <div className="hidden shrink-0 items-center gap-4 px-5 pb-4 lg:flex">
              <div
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-3"
                style={{ background: C.panel, border: `1px solid ${C.line}`, backdropFilter: "blur(20px)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: C.brandSoft, color: "#c4b5fd" }}
                >
                  <SkipForward className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.txt3 }}>Up next</p>
                  <p className="truncate text-sm font-semibold" style={{ color: C.txt }}>{nextLesson.title}</p>
                </div>
                <button
                  onClick={() => navigateTo(nextLesson.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", boxShadow: `0 8px 22px ${C.brandGlow}` }}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ Mobile bottom nav ════ */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex"
        style={{ background: "rgba(12,11,18,0.92)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.line}` }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setMobileTab(tab.id); setMobileDrawerOpen(true); }}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold"
            style={{ color: C.txt3 }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════ Mobile drawer ════ */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <div
            className="relative flex flex-col overflow-hidden rounded-t-3xl"
            style={{ height: "78dvh", background: C.panelSolid, border: `1px solid ${C.line}` }}
          >
            <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
              <div className="flex gap-1 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
                {TABS.map((tab) => {
                  const on = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setMobileTab(tab.id)}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      style={{ color: on ? "#fff" : C.txt3, background: on ? "linear-gradient(135deg,#8b5cf6,#7c3aed)" : "transparent" }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setMobileDrawerOpen(false)} className="text-lg leading-none" style={{ color: C.txt3 }}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
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

/* ═══════════ Progress Ring ═══════════ */

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative shrink-0">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color: "#e7e5ef" }}>
        {pct}%
      </span>
    </div>
  );
}

/* ═══════════ Lesson surface wrapper (quiz/coding/assignment) ═══════════ */

function LessonSurface({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h2 className="text-lg font-black tracking-tight" style={{ color: "#f8fafc" }}>{title}</h2>
        <Link
          href={href}
          className="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-[1.03]"
          style={{ background: C.brandSoft, color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          Full screen
        </Link>
      </div>
      {children}
    </div>
  );
}

/* ═══════════ ContentTab ═══════════ */

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
    setCollapsed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const typeIcon: Record<string, React.ReactNode> = {
    video: <PlayCircle className="h-4 w-4" />,
    article: <FileText className="h-4 w-4" />,
    quiz: <HelpCircle className="h-4 w-4" />,
    coding_exercise: <Code className="h-4 w-4" />,
    assignment: <ClipboardList className="h-4 w-4" />,
  };

  return (
    <div className="space-y-3">
      {sectionsWithLessons.map((section, sIdx) => {
        const isOpen = !collapsed.has(section.id);
        const done = section.lessons.filter((l) => completedIds.has(l.id)).length;
        const total = section.lessons.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-2xl"
            style={{ background: "#252040", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-110"
              style={{ background: "#2c2848" }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
                style={{ background: C.brandSoft, color: "#c4b5fd" }}
              >
                {sIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold leading-snug" style={{ color: "#ffffff" }}>{section.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#a78bfa,#7c3aed)", transition: "width 0.6s" }} />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#9d9ab5" }}>{done}/{total}</span>
                </div>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "#8c88a8" }} />
                : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "#8c88a8" }} />}
            </button>

            {/* Lessons */}
            {isOpen && (
              <ul className="space-y-0.5 p-1.5">
                {section.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isDone = completedIds.has(lesson.id);
                  const isLocked = !!(lesson.unlock_at && new Date() < new Date(lesson.unlock_at));
                  const dur = fmtDuration(lesson.duration_seconds);

                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => !isLocked && onNavigate(lesson.id)}
                        disabled={isLocked}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                        style={{
                          background: isCurrent ? "linear-gradient(135deg,rgba(139,92,246,0.28),rgba(124,58,237,0.1))" : "transparent",
                          boxShadow: isCurrent ? "inset 0 0 0 1px rgba(139,92,246,0.4)" : "none",
                          opacity: isLocked ? 0.45 : 1,
                          cursor: isLocked ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={(e) => { if (!isCurrent && !isLocked) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Icon chip */}
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: isDone ? "rgba(34,197,94,0.15)" : isCurrent ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                            color: isLocked ? C.txt3 : isDone ? "#4ade80" : isCurrent ? "#c4b5fd" : C.txt3,
                          }}
                        >
                          {isLocked ? <Lock className="h-3.5 w-3.5" />
                            : isDone ? <CheckCircle2 className="h-4 w-4" />
                            : isCurrent ? <PlayCircle className="h-4 w-4" />
                            : (typeIcon[lesson.type] ?? <Circle className="h-4 w-4" />)}
                        </span>

                        {/* Text */}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className="truncate text-[12px] leading-snug"
                            style={{
                              color: isCurrent ? "#ffffff" : isDone ? "#c5c2de" : "#d8d5f0",
                              fontWeight: isCurrent ? 700 : 500,
                            }}
                          >
                            {lesson.title}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "#7a7796" }}>
                            {isLocked && lesson.unlock_at
                              ? `Unlocks ${new Date(lesson.unlock_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                              : dur
                                ? <><Clock className="h-2.5 w-2.5" />{dur}</>
                                : lesson.type === "quiz" ? "Quiz"
                                : lesson.type === "coding_exercise" ? "Exercise"
                                : lesson.type === "assignment" ? "Assignment"
                                : lesson.type === "article" ? "Reading" : ""}
                          </span>
                        </span>

                        {isCurrent && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa" }} />
                        )}
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

/* ═══════════ NotesTab ═══════════ */

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
      .then(setNotes).catch(() => setNotes([])).finally(() => setLoading(false));
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
    <div className="space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitNote} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.line}` }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Take a note at the current timestamp…"
          rows={3}
          className="w-full resize-none rounded-xl px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none"
          style={{ background: "rgba(255,255,255,0.05)", color: C.txt, border: `1px solid ${C.line}` }}
        />
        <button
          type="submit"
          disabled={submitting || !newNote.trim()}
          className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}
        >
          Save at {formatTimestamp(Math.floor(progressRef.current))}
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <StickyNote className="h-8 w-8" style={{ color: "rgba(255,255,255,0.15)" }} />
          <p className="text-xs" style={{ color: C.txt3 }}>No notes for this lesson yet.</p>
        </div>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.line}` }}>
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl px-3 py-2 text-xs focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: C.txt, border: `1px solid ${C.line}` }}
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(note.id)} disabled={!editText.trim()} className="rounded-lg px-3 py-1 text-[10px] font-bold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.08)", color: C.txt2 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {note.timestamp_seconds !== null && (
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-mono font-bold" style={{ background: C.brandSoft, color: "#c4b5fd" }}>
                      {formatTimestamp(note.timestamp_seconds)}
                    </span>
                  )}
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => { setEditingId(note.id); setEditText(note.content); }} style={{ color: C.txt3 }} className="transition-colors hover:opacity-80"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => deleteNote(note.id)} style={{ color: C.txt3 }} className="transition-colors hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: C.txt2 }}>{note.content}</p>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════ QATab ═══════════ */

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
      .then(setQuestions).catch(() => setQuestions([])).finally(() => setLoading(false));
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
    <div className="space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitQuestion} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.line}` }}>
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask about this lesson…"
            className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", color: C.txt, border: `1px solid ${C.line}` }}
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="shrink-0 rounded-xl p-2 text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {submitError && <p className="mt-1.5 text-[10px]" style={{ color: "#f87171" }}>{submitError}</p>}
      </form>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageCircle className="h-8 w-8" style={{ color: "rgba(255,255,255,0.15)" }} />
          <p className="text-xs" style={{ color: C.txt3 }}>No questions yet. Ask the first one!</p>
        </div>
      ) : (
        questions.map((q) => {
          const expanded = expandedIds.has(q.id);
          return (
            <div key={q.id} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.line}` }}>
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: C.brandSoft, color: "#c4b5fd" }}>
                  {q.student_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold" style={{ color: C.txt3 }}>{q.student_name}</p>
                  <p className="mt-0.5 text-xs leading-snug" style={{ color: C.txt2 }}>{q.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => toggleExpand(q.id)} className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: C.txt3 }}>
                      {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {q.answers.length} answer{q.answers.length !== 1 ? "s" : ""}
                    </button>
                    <button onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)} className="text-[10px] font-semibold" style={{ color: C.txt3 }}>Reply</button>
                  </div>
                </div>
              </div>

              {expanded && q.answers.length > 0 && (
                <div className="mt-2.5 ml-9 space-y-2">
                  {q.answers.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.08)", color: C.txt2 }}>
                        {a.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px]" style={{ color: C.txt3 }}>{a.user_name}</p>
                        <p className="mt-0.5 text-xs leading-snug" style={{ color: C.txt2 }}>{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === q.id && (
                <div className="mt-2.5 ml-9 flex gap-2">
                  <input
                    value={replyTexts[q.id] ?? ""}
                    onChange={(e) => setReplyTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Write a reply…"
                    className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs placeholder:opacity-30 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", color: C.txt, border: `1px solid ${C.line}` }}
                  />
                  <button onClick={() => submitAnswer(q.id)} disabled={!replyTexts[q.id]?.trim()} className="shrink-0 rounded-lg p-1.5 text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg,#8b5cf6,#7c3aed)" }}>
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
