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
  ArrowLeft, SkipForward, Radio, PanelLeftClose, PanelLeftOpen, Clock, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Enrollment, Lesson, LessonProgress, Section, Question, LiveSession, Note } from "@/types";
import ReactMarkdown from "react-markdown";
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
  ink: "#f3f4f6",
  panel: "#ffffff",
  panelSolid: "#ffffff",
  line: "#d1d7dc",
  brand: "#0056d2",
  brandSoft: "#eaf1fb",
  brandGlow: "rgba(0,86,210,0.15)",
  txt: "#1c1d1f",
  txt2: "#3d4244",
  txt3: "#6a6f73",
};

const APP_BG = "#f3f4f6";

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        u.searchParams.set("enablejsapi", "1");
        return u.toString();
      }
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?enablejsapi=1`;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}?enablejsapi=1`;
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
  const [showCelebration, setShowCelebration] = useState(false);
  const prevProgressRef = useRef<number>(-1);

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

  useEffect(() => {
    if (progressPct === 100 && totalLessons > 0 && prevProgressRef.current < 100 && prevProgressRef.current >= 0) {
      setTimeout(() => setShowCelebration(true), 800);
    }
    prevProgressRef.current = progressPct;
  }, [progressPct, totalLessons]);


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
        style={{ background: "#ffffff", borderBottom: `1px solid ${C.line}` }}
      >
        <Link
          href="/dashboard"
          className="group flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
          style={{ color: C.brand, background: "rgba(0,86,210,0.06)" }}
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
          {/* Progress hero — Coursera style: simple text, thin progress bar */}
          <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold" style={{ color: C.txt }}>
                {enrollment.course_title ?? "Course"}
              </p>
              <span className="text-[11px]" style={{ color: C.txt3 }}>
                {completedCount}/{totalLessons}
              </span>
            </div>
            {/* Thin linear progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#e0e0e0" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: "#0056d2" }}
              />
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: C.brand }}>
              {progressPct === 100 ? "Course complete 🎉" : `${progressPct}% complete`}
            </p>
          </div>

          {/* Segmented tab control */}
          <div className="shrink-0" style={{ borderBottom: `1px solid ${C.line}` }}>
            <div className="flex"  style={{ background: "#ffffff" }}>
              {TABS.map((tab) => {
                const on = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-all"
                    style={{
                      color: on ? C.brand : C.txt3,
                      background: "transparent",
                      borderBottom: on ? `2px solid ${C.brand}` : "2px solid transparent",
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

        {/* ════ Main area ════ */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="hidden shrink-0 items-center gap-3 px-5 py-2.5 lg:flex" style={{ background: "#ffffff", borderBottom: `1px solid ${C.line}` }}>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-xl transition-all hover:scale-105"
              style={{ background: "#f3f4f6", color: C.txt2 }}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: C.brandSoft, color: C.brand, border: "1px solid #bdd4f8" }}
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
              {currentLesson.type === "video" && (
                completedIds.has(currentLesson.id) ? (
                  <span
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
                    style={{ background: "rgba(22,163,74,0.10)", color: "#16a34a" }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={() => saveProgress(0, 0, true)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-[1.03]"
                    style={{ background: C.brandSoft, color: C.brand, border: "1px solid #bdd4f8" }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark as Complete
                  </button>
                )
              )}

              {prevLesson && (
                <button
                  onClick={() => navigateTo(prevLesson.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
              )}
              {nextLesson && (
                <button
                  onClick={() => navigateTo(nextLesson.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
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
                  style={{ background: "transparent", opacity: 0 }}
                />
                <div
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl"
                  style={{ background: "#000000", border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                >
                  {currentLesson.video_url ? (() => {
                    const embedUrl = toEmbedUrl(currentLesson.video_url);
                    return embedUrl ? (
                      <iframe
                        id="yt-embed"
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
                        style={{ background: "#f3f4f6", border: `1px solid ${C.line}`, boxShadow: "none" }}
                      >
                        <PlayCircle className="h-9 w-9" style={{ color: C.txt3 }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: C.txt3 }}>Video not yet available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="h-full w-full overflow-y-auto rounded-2xl"
                style={{ background: "#ffffff", border: `1px solid ${C.line}` }}
              >
                {currentLesson.type === "quiz" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/quiz`}>
                    <QuizPlayer lessonId={currentLesson.id} token={_serverToken} onComplete={() => saveProgress(0, 0, true)} />
                  </LessonSurface>
                ) : currentLesson.type === "coding_exercise" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/coding-exercise`}>
                    <CodingExercisePlayer lessonId={currentLesson.id} token={_serverToken} onComplete={() => saveProgress(0, 0, true)} />
                  </LessonSurface>
                ) : currentLesson.type === "assignment" ? (
                  <LessonSurface title={currentLesson.title} href={`/learn/${enrollment.course_id}/${currentLesson.id}/assignment`}>
                    <AssignmentSubmissionPlayer lessonId={currentLesson.id} token={_serverToken} />
                  </LessonSurface>
                ) : (
                  <ArticleView
                    lesson={currentLesson}
                    isCompleted={completedIds.has(currentLesson.id)}
                    nextLesson={nextLesson}
                    onComplete={() => saveProgress(0, 0, true)}
                    onNavigate={navigateTo}
                  />
                )}
              </div>
            )}
          </div>

          {/* ════ Next lesson bar ════ */}
          {nextLesson && (
            <div className="hidden shrink-0 items-center gap-4 px-5 pb-4 lg:flex">
              <div
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-3"
                style={{ background: "#ffffff", border: `1px solid ${C.line}`, boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: C.brandSoft, color: C.brand }}
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
                  style={{ background: "#0056d2", boxShadow: "none" }}
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
        style={{ background: "#ffffff", borderTop: `1px solid ${C.line}` }}
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
              <div className="flex gap-1 rounded-2xl p-1" style={{ background: "#f3f4f6" }}>
                {TABS.map((tab) => {
                  const on = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setMobileTab(tab.id)}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
                      style={{ color: on ? C.txt : C.txt3, background: on ? "#ffffff" : "transparent", boxShadow: on ? "0 1px 4px rgba(0,0,0,0.12)" : "none" }}
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

      {showCelebration && (
        <CourseCompletionModal
          courseTitle={enrollment.course_title ?? "Course"}
          enrollmentId={enrollment.id}
          getAuthToken={getAuthToken}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}

/* ═══════════ Course Completion Modal ═══════════ */

const CONFETTI_COLORS = ["#0056d2","#a435f0","#16a34a","#f59e0b","#ef4444","#06b6d4","#ec4899"];

function CourseCompletionModal({
  courseTitle,
  onClose,
}: {
  courseTitle: string;
  enrollmentId: string;
  getAuthToken: () => Promise<string>;
  onClose: () => void;
}) {
  const router = useRouter();

  function handleCertificate() {
    onClose();
    router.push("/home/my-courses/completed");
  }

  const confettiPieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    duration: `${1.8 + Math.random() * 1.4}s`,
    size: `${6 + Math.random() * 8}px`,
    rotate: `${Math.random() * 360}deg`,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              transform: `rotate(${p.rotate})`,
              animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0%  { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100%{ transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes popIn {
          0%  { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.04); }
          100%{ transform: scale(1);   opacity: 1; }
        }
        @keyframes trophyBounce {
          0%,100%{ transform: translateY(0) scale(1); }
          40%    { transform: translateY(-12px) scale(1.08); }
        }
        @keyframes shimmer {
          0%  { background-position: -200% center; }
          100%{ background-position:  200% center; }
        }
      `}</style>

      {/* Card */}
      <div
        className="relative mx-4 flex w-full max-w-md flex-col items-center gap-6 rounded-3xl px-8 py-10 text-center shadow-2xl"
        style={{ background: "#ffffff", animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-lg transition-opacity hover:opacity-60"
          style={{ color: "#9ca3af", background: "#f3f4f6" }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Trophy */}
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full text-5xl"
          style={{
            background: "linear-gradient(135deg,#fef3c7,#fde68a)",
            border: "4px solid #f59e0b",
            animation: "trophyBounce 1.8s ease-in-out infinite",
            boxShadow: "0 8px 32px rgba(245,158,11,0.35)",
          }}
        >
          🏆
        </div>

        {/* Heading */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a435f0" }}>
            Course Complete
          </p>
          <h2
            className="mt-1 text-2xl font-black"
            style={{
              backgroundImage: "linear-gradient(90deg,#0056d2,#a435f0,#0056d2)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Congratulations! 🎉
          </h2>
          <p className="mt-2 text-sm font-medium" style={{ color: "#6a6f73" }}>
            You finished
          </p>
          <p className="mt-0.5 text-base font-bold" style={{ color: "#1c1d1f" }}>
            {courseTitle}
          </p>
        </div>

        {/* Stars */}
        <div className="flex gap-1 text-xl">
          {["⭐","⭐","⭐","⭐","⭐"].map((s, i) => (
            <span
              key={i}
              style={{ animation: `popIn 0.3s ${0.1 * i + 0.5}s both` }}
            >
              {s}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex w-full flex-col gap-3">
          <button
            onClick={handleCertificate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{ background: "linear-gradient(135deg,#0056d2,#a435f0)", boxShadow: "0 4px 16px rgba(0,86,210,0.35)" }}
          >
            <Trophy className="h-4 w-4" />
            Get My Certificate
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-2xl py-3 text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ color: "#6a6f73", border: "1px solid #d1d7dc" }}
          >
            Keep Learning
          </button>
        </div>
      </div>
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
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e0e0e0" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0056d2" />
            <stop offset="100%" stopColor="#0070c0" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color: C.txt }}>
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
        <h2 className="text-lg font-black tracking-tight" style={{ color: C.txt }}>{title}</h2>
        <Link
          href={href}
          className="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all hover:scale-[1.03]"
          style={{ background: C.brandSoft, color: C.brand, border: "1px solid #bdd4f8" }}
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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const currentSectionId = sectionsWithLessons.find((s) =>
      s.lessons.some((l) => l.id === currentLessonId)
    )?.id;
    return new Set(
      sectionsWithLessons.filter((s) => s.id !== currentSectionId).map((s) => s.id)
    );
  });

  function toggleSection(id: string) {
    setCollapsed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  /* Progressive section locking: section N unlocks only when all lessons in N-1 are done */
  const unlockedSectionIds = new Set<string>();
  for (let i = 0; i < sectionsWithLessons.length; i++) {
    const section = sectionsWithLessons[i];
    if (!section) break;
    if (i === 0) {
      unlockedSectionIds.add(section.id);
    } else {
      const prev = sectionsWithLessons[i - 1];
      if (!prev) break;
      const prevAllDone = prev.lessons.length > 0 && prev.lessons.every((l) => completedIds.has(l.id));
      if (prevAllDone) {
        unlockedSectionIds.add(section.id);
      } else {
        break;
      }
    }
  }

  return (
    <div>
      {sectionsWithLessons.map((section, sIdx) => {
        const isOpen = !collapsed.has(section.id);
        const done = section.lessons.filter((l) => completedIds.has(l.id)).length;
        const total = section.lessons.length;
        const sectionDone = total > 0 && done === total;
        const sectionLocked = !unlockedSectionIds.has(section.id);

        return (
          <div
            key={section.id}
            style={{ borderBottom: `1px solid ${C.line}`, opacity: sectionLocked ? 0.55 : 1 }}
          >
            {/* Section header */}
            <button
              onClick={() => !sectionLocked && toggleSection(section.id)}
              disabled={sectionLocked}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
              style={{
                background: sectionLocked ? "#f7f9fa" : sectionDone ? "#f0fdf4" : isOpen ? "#eaf1fb" : "transparent",
                cursor: sectionLocked ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (!isOpen && !sectionDone && !sectionLocked) e.currentTarget.style.background = "#f7f9fa"; }}
              onMouseLeave={(e) => { if (!isOpen && !sectionDone && !sectionLocked) e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sectionLocked ? C.txt3 : sectionDone ? "#16a34a" : C.brand }}>
                  Section {sIdx + 1}
                </p>
                <p className="mt-0.5 text-[13px] font-bold leading-snug" style={{ color: C.txt }}>
                  {section.title}
                </p>
                <p className="mt-0.5 text-[11px]" style={{ color: sectionLocked ? C.txt3 : sectionDone ? "#16a34a" : C.txt3 }}>
                  {sectionLocked ? "Complete previous section to unlock" : sectionDone ? "✓ Section complete" : `${done}/${total} completed`}
                </p>
              </div>
              {sectionLocked
                ? <Lock className="h-4 w-4 shrink-0 mt-1" style={{ color: C.txt3 }} />
                : isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 mt-1" style={{ color: C.txt3 }} />
                  : <ChevronDown className="h-4 w-4 shrink-0 mt-1" style={{ color: C.txt3 }} />}
            </button>

            {/* Lessons — only shown when section is unlocked and open */}
            {!sectionLocked && isOpen && (
              <ul>
                {section.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isDone = completedIds.has(lesson.id);
                  const isLocked = !!(lesson.unlock_at && new Date() < new Date(lesson.unlock_at));
                  const dur = fmtDuration(lesson.duration_seconds);
                  const typeLabel =
                    lesson.type === "quiz" ? "Quiz"
                    : lesson.type === "coding_exercise" ? "Exercise"
                    : lesson.type === "assignment" ? "Assignment"
                    : lesson.type === "article" ? "Reading"
                    : "Video";

                  return (
                    <li key={lesson.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <button
                        onClick={() => !isLocked && onNavigate(lesson.id)}
                        disabled={isLocked}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          background: isCurrent ? "#eaf1fb" : "transparent",
                          opacity: isLocked ? 0.5 : 1,
                          cursor: isLocked ? "not-allowed" : "pointer",
                          borderLeft: isCurrent ? `3px solid ${C.brand}` : "3px solid transparent",
                        }}
                        onMouseEnter={(e) => { if (!isCurrent && !isLocked) e.currentTarget.style.background = "#f7f9fa"; }}
                        onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Status circle */}
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: isDone ? "#16a34a" : "transparent",
                            border: isDone ? "none" : `2px solid ${isCurrent ? C.brand : "#9ca3af"}`,
                          }}
                        >
                          {isLocked
                            ? <Lock className="h-2.5 w-2.5" style={{ color: C.txt3 }} />
                            : isDone
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                              : null}
                        </span>

                        {/* Text */}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className="text-[12px] leading-snug"
                            style={{
                              color: isCurrent ? C.brand : isDone ? C.txt3 : C.txt,
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            {lesson.title}
                          </span>
                          <span className="text-[11px]" style={{ color: C.txt3 }}>
                            {isLocked && lesson.unlock_at
                              ? `Unlocks ${new Date(lesson.unlock_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                              : dur
                                ? `${typeLabel} · ${dur}`
                                : typeLabel}
                          </span>
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
      {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f7f9fa" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitNote} className="rounded-2xl p-3" style={{ background: "#f7f9fa", border: `1px solid ${C.line}` }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Take a note at the current timestamp…"
          rows={3}
          className="w-full resize-none rounded-xl px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none"
          style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
        />
        <button
          type="submit"
          disabled={submitting || !newNote.trim()}
          className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: "#0056d2" }}
        >
          Save at {formatTimestamp(Math.floor(progressRef.current))}
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <StickyNote className="h-8 w-8" style={{ color: "#d1d7dc" }} />
          <p className="text-xs" style={{ color: C.txt3 }}>No notes for this lesson yet.</p>
        </div>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="rounded-2xl p-3" style={{ background: "#f7f9fa", border: `1px solid ${C.line}` }}>
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl px-3 py-2 text-xs focus:outline-none"
                  style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(note.id)} disabled={!editText.trim()} className="rounded-lg px-3 py-1 text-[10px] font-bold text-white disabled:opacity-40" style={{ background: "#0056d2" }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1 text-[10px]" style={{ background: "#ffffff", color: C.txt2, border: `1px solid ${C.line}` }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {note.timestamp_seconds !== null && (
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-mono font-bold" style={{ background: C.brandSoft, color: C.brand }}>
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
      {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#f7f9fa" }} />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitQuestion} className="rounded-2xl p-3" style={{ background: "#f7f9fa", border: `1px solid ${C.line}` }}>
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask about this lesson…"
            className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs placeholder:opacity-30 focus:outline-none"
            style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="shrink-0 rounded-xl p-2 text-white disabled:opacity-40 transition-all"
            style={{ background: "#0056d2" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {submitError && <p className="mt-1.5 text-[10px]" style={{ color: "#f87171" }}>{submitError}</p>}
      </form>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageCircle className="h-8 w-8" style={{ color: "#d1d7dc" }} />
          <p className="text-xs" style={{ color: C.txt3 }}>No questions yet. Ask the first one!</p>
        </div>
      ) : (
        questions.map((q) => {
          const expanded = expandedIds.has(q.id);
          return (
            <div key={q.id} className="rounded-2xl p-3" style={{ background: "#f7f9fa", border: `1px solid ${C.line}` }}>
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: C.brandSoft, color: C.brand }}>
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
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "#ffffff", color: C.txt2, border: "1px solid #e0e0e0" }}>
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
                    style={{ background: "#ffffff", color: C.txt, border: `1px solid ${C.line}` }}
                  />
                  <button onClick={() => submitAnswer(q.id)} disabled={!replyTexts[q.id]?.trim()} className="shrink-0 rounded-lg p-1.5 text-white disabled:opacity-40" style={{ background: "#0056d2" }}>
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

/* ═══════════ ArticleView ═══════════ */

function ArticleView({
  lesson,
  isCompleted,
  nextLesson,
  onComplete,
  onNavigate,
}: {
  lesson: Lesson;
  isCompleted: boolean;
  nextLesson: Lesson | null;
  onComplete: () => void;
  onNavigate: (id: string) => void;
}) {
  const [marking, setMarking] = useState(false);

  async function handleMarkComplete() {
    setMarking(true);
    await onComplete();
    setMarking(false);
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-8 lg:px-10 lg:py-10">
      {/* Badge */}
      <span
        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
        style={{ background: C.brandSoft, color: C.brand, border: "1px solid #bdd4f8" }}
      >
        Article
      </span>

      {/* Title */}
      <h1 className="mt-4 text-2xl font-black tracking-tight lg:text-3xl" style={{ color: C.txt }}>
        {lesson.title}
      </h1>
      <div className="mt-5 h-px" style={{ background: C.line }} />

      {/* Content */}
      {lesson.content ? (
        <div
          className="mt-6 prose-article"
          style={{ color: C.txt2 }}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 style={{ color: C.txt, fontSize: "1.5rem", fontWeight: 900, marginTop: "1.75rem", marginBottom: "0.5rem" }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ color: C.txt, fontSize: "1.25rem", fontWeight: 800, marginTop: "1.5rem", marginBottom: "0.5rem" }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ color: C.txt, fontSize: "1.05rem", fontWeight: 700, marginTop: "1.25rem", marginBottom: "0.4rem" }}>{children}</h3>,
              p: ({ children }) => <p style={{ color: C.txt2, lineHeight: "1.85", marginBottom: "1rem" }}>{children}</p>,
              li: ({ children }) => <li style={{ color: C.txt2, marginBottom: "0.3rem", lineHeight: "1.7" }}>{children}</li>,
              ul: ({ children }) => <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem", listStyleType: "disc" }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: "1.25rem", marginBottom: "1rem", listStyleType: "decimal" }}>{children}</ol>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code style={{ display: "block", background: "#f7f9fa", color: C.txt, padding: "0.1rem 0.3rem", borderRadius: "0.25rem", fontSize: "0.85em", fontFamily: "monospace" }}>{children}</code>
                ) : (
                  <code style={{ background: "#f3f4f6", color: C.txt, padding: "0.1rem 0.4rem", borderRadius: "0.3rem", fontSize: "0.88em", fontFamily: "monospace" }}>{children}</code>
                );
              },
              pre: ({ children }) => <pre style={{ background: "#f7f9fa", border: `1px solid ${C.line}`, borderRadius: "0.75rem", padding: "1rem", overflowX: "auto", marginBottom: "1rem", fontSize: "0.875rem", lineHeight: "1.6", fontFamily: "monospace", color: C.txt }}>{children}</pre>,
              strong: ({ children }) => <strong style={{ color: C.txt, fontWeight: 700 }}>{children}</strong>,
              em: ({ children }) => <em style={{ color: C.txt2, fontStyle: "italic" }}>{children}</em>,
              blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #0056d2", paddingLeft: "1rem", color: C.txt3, marginBottom: "1rem", fontStyle: "italic" }}>{children}</blockquote>,
              hr: () => <hr style={{ border: "none", borderTop: `1px solid ${C.line}`, margin: "1.5rem 0" }} />,
            }}
          >
            {lesson.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="mt-6 text-sm" style={{ color: C.txt3 }}>Content coming soon.</p>
      )}

      {/* ══ Completion block ══ */}
      <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${C.line}` }}>
        {isCompleted ? (
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Completed state */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.25)", boxShadow: "none" }}
            >
              <Trophy className="h-8 w-8" style={{ color: "#16a34a" }} />
            </div>
            <div>
              <p className="text-base font-black" style={{ color: "#16a34a" }}>Lesson completed!</p>
              <p className="mt-0.5 text-sm" style={{ color: C.txt3 }}>Great work. Keep the momentum going.</p>
            </div>
            {nextLesson && (
              <button
                onClick={() => onNavigate(nextLesson.id)}
                className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all hover:scale-[1.03] hover:shadow-lg"
                style={{ background: "#0056d2", boxShadow: "0 2px 8px rgba(0,86,210,0.3)" }}
              >
                Next lesson
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm" style={{ color: C.txt3 }}>Done reading? Mark this lesson as complete.</p>
            <button
              onClick={handleMarkComplete}
              disabled={marking}
              className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black text-white transition-all hover:scale-[1.03] disabled:opacity-60"
              style={{ background: "#0056d2", boxShadow: "0 2px 8px rgba(0,86,210,0.3)" }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {marking ? "Saving…" : "Mark as Complete"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
