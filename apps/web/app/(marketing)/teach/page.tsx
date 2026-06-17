"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { BookOpen, DollarSign, Users, Star, ChevronRight, PlayCircle, BarChart3, Globe, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

const PERKS = [
  { icon: DollarSign, title: "Earn revenue",       desc: "Get paid for every enrollment. Set your own price and keep up to 70% of every sale." },
  { icon: Users,      title: "Reach students",     desc: "Publish once and reach thousands of learners across the globe." },
  { icon: BarChart3,  title: "Track performance",  desc: "Built-in analytics show you enrollment, revenue, ratings, and student engagement." },
  { icon: Globe,      title: "Teach in any language", desc: "Support for multi-language courses. Reach students in their native language." },
  { icon: PlayCircle, title: "Rich course tools",  desc: "Video lessons, quizzes, coding exercises, assignments, drip content, and more." },
  { icon: Star,       title: "Build your brand",   desc: "Public instructor profile, reviews, and a dedicated course page that ranks on search." },
];

const STEPS = [
  { n: "01", title: "Create your course",    desc: "Use our curriculum builder to add video lessons, quizzes, and exercises." },
  { n: "02", title: "Set your price",        desc: "Choose free or paid. Add coupons to grow your audience faster." },
  { n: "03", title: "Publish & earn",        desc: "Hit publish. Students enroll, revenue flows to your payout account." },
];

export default function TeachPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const role = user?.publicMetadata?.role as string | undefined;
  const isInstructor = role === "instructor" || role === "admin";

  async function handleBecomeInstructor() {
    if (!user) { router.push("/sign-up"); return; }
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      await apiFetch("/api/v1/users/me/become-instructor", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Force Clerk to refresh the session token so new role is picked up
      await user.reload();
      router.push("/instructor/courses");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div
        className="relative overflow-hidden px-4 py-24 text-white sm:px-6"
        style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}
      >
        {/* aurora blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-30" style={{ background: "radial-gradient(circle,#6366f1,transparent 65%)", filter: "blur(80px)" }} />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-[400px] w-[400px] rounded-full opacity-20" style={{ background: "radial-gradient(circle,#a855f7,transparent 65%)", filter: "blur(70px)" }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 backdrop-blur">
            <BookOpen className="h-3.5 w-3.5" /> Learnly for Instructors
          </span>
          <h1 className="mt-6 text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Teach the world.<br />
            <span style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Earn doing it.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Join thousands of instructors sharing their expertise on Learnly. Create your first course today — it&apos;s free to publish.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {isLoaded && isInstructor ? (
              <Link
                href="/instructor/courses"
                className="flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
              >
                Go to your dashboard <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={handleBecomeInstructor}
                disabled={loading}
                className="flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                {loading ? "Setting up your account…" : isLoaded && user ? "Become an instructor" : "Get started — it's free"}
              </button>
            )}
            {error && <p className="w-full text-center text-sm text-red-400">{error}</p>}
            <Link
              href="/courses"
              className="rounded-full border border-white/20 bg-white/8 px-8 py-3.5 text-sm font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/14"
            >
              Browse courses first
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-2xl font-black" style={{ color: "#1c1d1f" }}>How it works</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <span className="inline-block text-5xl font-black" style={{ color: "#e5e7eb" }}>{n}</span>
              <h3 className="mt-2 text-base font-bold" style={{ color: "#1c1d1f" }}>{title}</h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6a6f73" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Perks grid */}
      <div style={{ background: "#f7f9fa" }}>
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-2xl font-black" style={{ color: "#1c1d1f" }}>Everything you need to succeed</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl bg-white p-6" style={{ border: "1px solid #d1d7dc" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#eef2ff" }}>
                  <Icon className="h-5 w-5" style={{ color: "#4f46e5" }} />
                </div>
                <h3 className="mt-4 text-sm font-bold" style={{ color: "#1c1d1f" }}>{title}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6a6f73" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-black" style={{ color: "#1c1d1f" }}>Ready to start teaching?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "#6a6f73" }}>
          Free to publish. No upfront cost. Start building your course today.
        </p>
        {isLoaded && isInstructor ? (
          <Link
            href="/instructor/courses"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
          >
            Go to your dashboard <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={handleBecomeInstructor}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Setting up…" : isLoaded && user ? "Become an instructor" : "Get started — it's free"}
            {!loading && <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
