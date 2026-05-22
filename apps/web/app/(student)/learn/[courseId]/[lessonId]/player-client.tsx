"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, PlayCircle, FileText, ChevronLeft, MessageCircle, BookOpen, ChevronDown, ChevronUp, Send, HelpCircle, MessagesSquare, Lock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { Enrollment, Lesson, LessonProgress, Section, Question } from "@/types";
import { QuizPlayer } from "@/components/features/quiz/quiz-player";
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

type SidebarTab = "content" | "qa" | "forums";

interface ProgressSSEEvent {
  lesson_id: string;
  is_completed: boolean;
  watched_seconds: number;
  last_position_seconds: number;
  completed_at: string | null;
}

export function PlayerClient({ enrollment, sectionsWithLessons, currentLesson, token, initialProgress }: Props) {
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

  const allLessons = sectionsWithLessons.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = allLessons[currentIndex + 1] ?? null;

  const saveProgress = useCallback(
    async (watched: number, position: number, completed: boolean) => {
      try {
        await apiFetch(`/api/v1/enrollments/${enrollment.id}/progress`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
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
            posthog?.capture("lesson_completed", {
              lesson_id: currentLesson.id,
              course_id: enrollment.course_id,
            });
            return new Set([...prev, currentLesson.id]);
          });
        }
      } catch {
        // silent — non-blocking
      }
    },
    [enrollment.id, currentLesson.id, token]
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
          if (data.is_completed) {
            setCompletedIds((prev) => new Set([...prev, data.lesson_id]));
          }
        } catch {
          // malformed message — ignore
        }
      };
      es.onerror = () => {
        es?.close();
        if (retries < 3) {
          reconnectTimeout = setTimeout(connect, Math.pow(2, retries) * 2000);
          retries++;
        }
        // after 3 retries fall back to existing 10-second polling silently
      };
    }

    connect();
    return () => {
      es?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [enrollment.id]);

  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      if (progressRef.current > 0) {
        saveProgress(progressRef.current, progressRef.current, false);
      }
    }, 10_000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [saveProgress]);

  function handleTimeUpdate(currentTime: number, duration: number) {
    progressRef.current = currentTime;
    if (duration > 0 && currentTime / duration >= 0.9) {
      saveProgress(Math.floor(currentTime), Math.floor(currentTime), true);
    }
  }

  function navigateTo(lessonId: string) {
    router.push(`/learn/${enrollment.course_id}/${lessonId}`);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[oklch(10%_0.02_295)] pb-13 lg:pb-0">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[oklch(12%_0.03_295)] px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          My Learning
        </Link>
        <span className="text-white/30">/</span>
        <span className="truncate text-xs text-white/70">{currentLesson.title}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video / content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {currentLesson.type === "video" ? (
            <div className="relative flex-1 bg-black">
              {currentLesson.video_url ? (
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
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-white/40">
                    <PlayCircle className="mx-auto h-16 w-16 mb-3" />
                    <p className="text-sm">Video not yet available</p>
                  </div>
                </div>
              )}
            </div>
          ) : currentLesson.type === "quiz" ? (
            <QuizPlayer lessonId={currentLesson.id} token={token} />
          ) : (
            <div className="flex-1 overflow-y-auto p-8">
              <h2 className="text-xl font-bold text-white">{currentLesson.title}</h2>
              {currentLesson.content ? (
                <div className="mt-4 prose prose-invert max-w-none text-white/80">
                  {currentLesson.content}
                </div>
              ) : (
                <p className="mt-4 text-white/50">Content coming soon.</p>
              )}
            </div>
          )}

          {nextLesson && (
            <div className="shrink-0 flex items-center justify-between border-t border-white/10 bg-[oklch(12%_0.03_295)] px-6 py-3">
              <span className="text-xs text-white/50">Up next: {nextLesson.title}</span>
              <button
                onClick={() => navigateTo(nextLesson.id)}
                className="rounded-sm bg-[--color-primary] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
              >
                Next lesson →
              </button>
            </div>
          )}
        </div>

        {/* Mobile bottom bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-[oklch(12%_0.03_295)]">
          {(["content", "qa", "forums"] as SidebarTab[]).map((tab) => {
            const labels: Record<SidebarTab, string> = { content: "Content", qa: "Q&A", forums: "Forums" };
            const icons: Record<SidebarTab, React.ReactNode> = {
              content: <BookOpen className="h-4 w-4" />,
              qa: <MessageCircle className="h-4 w-4" />,
              forums: <MessagesSquare className="h-4 w-4" />,
            };
            return (
              <button
                key={tab}
                onClick={() => { setMobileTab(tab); setMobileDrawerOpen(true); }}
                className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                {icons[tab]}
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Mobile drawer overlay */}
        {mobileDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileDrawerOpen(false)} />
            <div className="relative flex flex-col rounded-t-2xl bg-[oklch(12%_0.03_295)] overflow-hidden" style={{ height: "75dvh" }}>
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex gap-4">
                  {(["content", "qa", "forums"] as SidebarTab[]).map((tab) => {
                    const labels: Record<SidebarTab, string> = { content: "Course Content", qa: "Q&A", forums: "Forums" };
                    return (
                      <button
                        key={tab}
                        onClick={() => setMobileTab(tab)}
                        className={`text-xs font-medium transition-colors ${mobileTab === tab ? "text-white border-b-2 border-[--color-primary] pb-0.5" : "text-white/40 hover:text-white/70"}`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setMobileDrawerOpen(false)} className="text-white/50 hover:text-white transition-colors text-lg leading-none">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {mobileTab === "content" ? (
                  <ContentTab sectionsWithLessons={sectionsWithLessons} currentLessonId={currentLesson.id} onNavigate={(id) => { setMobileDrawerOpen(false); navigateTo(id); }} completedIds={completedIds} />
                ) : mobileTab === "qa" ? (
                  <QATab lessonId={currentLesson.id} token={token} />
                ) : (
                  <DiscussionSection courseId={enrollment.course_id} theme="dark" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-white/10 bg-[oklch(12%_0.03_295)] lg:flex overflow-hidden">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/10">
            <button
              onClick={() => setActiveTab("content")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === "content"
                  ? "border-b-2 border-[--color-primary] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Course content
            </button>
            <button
              onClick={() => setActiveTab("qa")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === "qa"
                  ? "border-b-2 border-[--color-primary] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Q&amp;A
            </button>
            <button
              onClick={() => setActiveTab("forums")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === "forums"
                  ? "border-b-2 border-[--color-primary] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <MessagesSquare className="h-3.5 w-3.5" />
              Forums
            </button>
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
            ) : activeTab === "qa" ? (
              <QATab lessonId={currentLesson.id} token={token} />
            ) : (
              <DiscussionSection courseId={enrollment.course_id} theme="dark" />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

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
  return (
    <>
      {sectionsWithLessons.map((section) => (
        <div key={section.id}>
          <div className="px-4 py-3 bg-white/5 border-b border-white/10">
            <p className="text-xs font-semibold text-white/80">{section.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{section.lessons.length} lessons</p>
          </div>
          <ul>
            {section.lessons.map((lesson) => {
              const isCurrent = lesson.id === currentLessonId;
              const isLocked = !!(lesson.unlock_at && new Date() < new Date(lesson.unlock_at));
              const unlockLabel = isLocked
                ? `Unlocks ${new Date(lesson.unlock_at!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : null;
              return (
                <li key={lesson.id}>
                  <button
                    onClick={() => !isLocked && onNavigate(lesson.id)}
                    disabled={isLocked}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left text-xs transition-colors ${
                      isLocked
                        ? "cursor-not-allowed opacity-50"
                        : `hover:bg-white/5 ${isCurrent ? "bg-[--color-primary]/20" : ""}`
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-white/30" />
                      ) : isCurrent ? (
                        <PlayCircle className="h-4 w-4 text-[--color-primary]" />
                      ) : completedIds.has(lesson.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : lesson.type === "video" ? (
                        <Circle className="h-4 w-4 text-white/30" />
                      ) : lesson.type === "quiz" ? (
                        <HelpCircle className="h-4 w-4 text-white/30" />
                      ) : (
                        <FileText className="h-4 w-4 text-white/30" />
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className={`leading-snug ${isCurrent ? "text-white font-medium" : "text-white/60"}`}>
                        {lesson.title}
                      </span>
                      {unlockLabel && (
                        <span className="text-[10px] text-white/35">{unlockLabel}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}


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
      .then(setQuestions)
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [lessonId]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const q = await apiFetch<Question>(`/api/v1/lessons/${lessonId}/questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: newQuestion.trim() }),
      });
      setQuestions((prev) => [q, ...prev]);
      setNewQuestion("");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to post question");
    } finally {
      setSubmitting(false);
    }
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
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: [...q.answers, a as Question["answers"][number]] }
            : q
        )
      );
      setReplyTexts((prev) => ({ ...prev, [questionId]: "" }));
      setReplyingTo(null);
    } catch {
      // TODO: show error toast
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Ask question form */}
      <form onSubmit={submitQuestion} className="shrink-0 p-3 border-b border-white/10">
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a question about this lesson…"
            className="flex-1 rounded bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[--color-primary] min-w-0"
          />
          <button
            type="submit"
            disabled={submitting || !newQuestion.trim()}
            className="shrink-0 rounded bg-[--color-primary] p-1.5 text-white disabled:opacity-40 hover:bg-[--color-primary-hover] transition-colors"
            aria-label="Post question"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {submitError && (
        <p className="shrink-0 px-3 py-1 text-[10px] text-red-400">{submitError}</p>
      )}

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <MessageCircle className="h-8 w-8 text-white/20" />
            <p className="text-xs text-white/30">No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          questions.map((q) => {
            const expanded = expandedIds.has(q.id);
            return (
              <div key={q.id} className="px-3 py-3">
                {/* Question */}
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[--color-primary]/20 text-[10px] font-bold text-[--color-primary]">
                    {q.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/40">{q.student_name}</p>
                    <p className="text-xs text-white/80 leading-snug mt-0.5">{q.body}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="flex items-center gap-0.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {q.answers.length} answer{q.answers.length !== 1 ? "s" : ""}
                      </button>
                      <button
                        onClick={() => setReplyingTo(replyingTo === q.id ? null : q.id)}
                        className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                {expanded && q.answers.length > 0 && (
                  <div className="mt-2 ml-8 space-y-2">
                    {q.answers.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
                          {a.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/30">{a.user_name}</p>
                          <p className="text-xs text-white/70 leading-snug mt-0.5">{a.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === q.id && (
                  <div className="mt-2 ml-8 flex gap-2">
                    <input
                      value={replyTexts[q.id] ?? ""}
                      onChange={(e) => setReplyTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write a reply…"
                      className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[--color-primary] min-w-0"
                    />
                    <button
                      onClick={() => submitAnswer(q.id)}
                      disabled={!replyTexts[q.id]?.trim()}
                      className="shrink-0 rounded bg-[--color-primary] p-1 text-white disabled:opacity-40 hover:bg-[--color-primary-hover] transition-colors"
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
