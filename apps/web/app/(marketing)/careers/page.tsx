import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers — Learnly",
  description: "Learnly careers information, current hiring status, and how to reach the team for future opportunities.",
};

function CareersHero() {
  return (
    <section className="mesh-panel relative overflow-hidden text-white">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-white/76">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-[--brand-300]" />
          Careers
        </span>
        <h1 className="mt-6 max-w-3xl font-heading text-4xl font-black tracking-tight sm:text-5xl">
          Small team. Careful hiring.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-white/76 sm:text-lg">
          Learnly is not actively hiring right now, but we keep this page live so future candidates know where to reach us.
        </p>
      </div>
    </section>
  );
}

function CareersCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
      <div className="premium-card rounded-[--radius-xl] p-8 sm:p-10">
        <h2 className="font-heading text-2xl font-black text-[--color-text-primary]">Stay in touch</h2>
        <p className="mt-3 max-w-2xl text-sm text-[--color-text-secondary]">
          Send a concise note if you want to be considered when roles open later. This is not a guarantee of review or reply, but it is the right place to introduce yourself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="mailto:hello@learnly.app?subject=Future%20career%20interest"
            className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
          >
            <Mail className="h-4 w-4" />
            Contact team
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[--color-border] bg-[--color-surface-raised] px-6 py-3 text-sm font-extrabold text-[--color-text-primary] transition-colors hover:bg-[--color-surface]"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function CareersPage() {
  return (
    <div className="premium-shell">
      <CareersHero />

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="premium-card rounded-[--radius-xl] p-8">
            <h2 className="font-heading text-3xl font-black text-[--color-text-primary]">Current status</h2>
            <p className="mt-5 text-sm leading-7 text-[--color-text-secondary]">
              There are no open roles posted at the moment. When hiring resumes, this page will be updated with available positions, role expectations, and application details.
            </p>
            <p className="mt-4 text-sm leading-7 text-[--color-text-secondary]">
              If your background strongly overlaps with online education, marketplace products, or creator tooling, you can still send a short introduction for future consideration.
            </p>
          </div>

          <div className="premium-card rounded-[--radius-xl] p-8">
            <span className="inline-flex rounded-full bg-[--color-primary]/10 p-3 text-[--color-primary]">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-heading text-2xl font-black text-[--color-text-primary]">What to include</h2>
            <ul className="mt-5 space-y-3 text-sm text-[--color-text-secondary]">
              <li>Short background summary</li>
              <li>Links to portfolio, GitHub, or LinkedIn</li>
              <li>Why Learnly feels relevant</li>
              <li>The role area you would want next time</li>
            </ul>
          </div>
        </div>
      </section>

      <CareersCta />
    </div>
  );
}
