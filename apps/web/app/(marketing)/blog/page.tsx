import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper, PenSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — Learnly",
  description: "Updates, product notes, and learning insights from Learnly. No posts are published yet, but this page is ready for future articles.",
};

export default function BlogPage() {
  return (
    <div className="premium-shell">
      <section className="mesh-panel relative overflow-hidden text-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-white/76">
            <Newspaper className="h-3.5 w-3.5 text-[--brand-300]" />
            Learnly blog
          </span>
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-black tracking-tight sm:text-5xl">
            Product updates and learning notes.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/76 sm:text-lg">
            This page will list future posts about the platform, instructors, and course marketplace insights.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="premium-card rounded-[--radius-xl] p-10 text-center">
          <span className="mx-auto inline-flex rounded-full bg-[--color-primary]/10 p-4 text-[--color-primary]">
            <PenSquare className="h-6 w-6" />
          </span>
          <h2 className="mt-5 font-heading text-3xl font-black text-[--color-text-primary]">No posts yet</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[--color-text-secondary]">
            The blog index is live and ready, but there are no published articles yet. Check back later for product updates, platform writing, and learning-focused announcements.
          </p>
          <div className="mt-8">
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
    </div>
  );
}
