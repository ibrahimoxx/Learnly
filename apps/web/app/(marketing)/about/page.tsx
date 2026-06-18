import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Globe2, Sparkles, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Learnly",
  description: "Learn how Learnly helps students discover expert-led online courses and gives instructors a place to publish practical, career-focused learning.",
};

const pillars = [
  {
    icon: BookOpen,
    title: "Practical learning",
    body: "Learnly focuses on applied courses that help learners build job-ready skills through structured lessons, projects, and guided practice.",
  },
  {
    icon: Users,
    title: "Instructor-powered marketplace",
    body: "Independent instructors can publish and improve courses while students choose the teaching style, depth, and subject that fits them best.",
  },
  {
    icon: Globe2,
    title: "Accessible online format",
    body: "Courses are built for flexible, self-paced study across devices so learners can keep momentum without needing a fixed schedule.",
  },
];

function AboutHero() {
  return (
    <section className="mesh-panel relative overflow-hidden text-white">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-white/76">
          <Sparkles className="h-3.5 w-3.5 text-[--brand-300]" />
          About Learnly
        </span>
        <h1 className="mt-6 max-w-3xl font-heading text-4xl font-black tracking-tight sm:text-5xl">
          Skill building through expert-led online courses.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-white/76 sm:text-lg">
          Learnly is an online course marketplace built to connect motivated learners with instructors who can teach practical, modern skills.
        </p>
      </div>
    </section>
  );
}

function AboutCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="premium-card rounded-[--radius-xl] p-8 sm:p-10">
        <h2 className="font-heading text-2xl font-black text-[--color-text-primary]">Start exploring the catalog</h2>
        <p className="mt-3 max-w-2xl text-sm text-[--color-text-secondary]">
          Browse courses by topic, compare teaching styles, and find a path that matches your next skill goal.
        </p>
        <div className="mt-6">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
          >
            Browse courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="premium-shell">
      <AboutHero />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="premium-card rounded-[--radius-xl] p-8">
            <h2 className="font-heading text-3xl font-black text-[--color-text-primary]">What the platform does</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[--color-text-secondary]">
              <p>
                Learnly helps people discover, buy, and complete online courses across topics like web development, data science, design, and other professional skills.
              </p>
              <p>
                Instructors can apply, publish courses, engage with learners, and build a teaching business. Students can enroll, track progress, complete lessons, and earn certificates as they move through the catalog.
              </p>
              <p>
                The goal is simple: make skill development easier to start, easier to continue, and easier to fit into real schedules.
              </p>
            </div>
          </div>

          <div className="premium-card rounded-[--radius-xl] p-8">
            <h2 className="font-heading text-2xl font-black text-[--color-text-primary]">How Learnly works</h2>
            <div className="mt-6 space-y-4">
              {["Browse courses", "Enroll in a topic", "Learn at your own pace", "Ask questions and track progress"].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[--color-primary-subtle] text-xs font-extrabold text-[--brand-800]">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-semibold text-[--color-text-secondary]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="premium-card rounded-[--radius-xl] p-7">
              <span className="inline-flex rounded-full bg-[--color-primary]/10 p-3 text-[--color-primary]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-heading text-xl font-black text-[--color-text-primary]">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[--color-text-secondary]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <AboutCta />
    </div>
  );
}
