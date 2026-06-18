import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cookie } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy — Learnly",
  description: "Learnly Cookie Policy describing authentication cookies, analytics cookies, preference storage, and user controls.",
};

const sections = [
  {
    title: "1. What this policy covers",
    body: [
      "This Cookie Policy explains how Learnly uses cookies and similar storage technologies on its website and product surfaces.",
      "Cookies may be set directly by Learnly or by service providers that support authentication, analytics, payments, and essential product functions.",
    ],
  },
  {
    title: "2. Essential cookies",
    body: [
      "Essential cookies help core platform features work, including sign-in state, session continuity, security checks, and account access control.",
      "Authentication and session handling may rely on services such as Clerk or similar identity infrastructure.",
    ],
  },
  {
    title: "3. Analytics and measurement",
    body: [
      "When enabled, Learnly may use analytics tools such as PostHog to understand page usage, product flows, and feature performance.",
      "These tools help Learnly improve navigation, measure adoption, and identify problems, but they should be configured consistently with Learnly privacy settings and legal obligations.",
    ],
  },
  {
    title: "4. Preference and experience cookies",
    body: [
      "Some cookies or local storage entries may remember preferences such as language, interface state, or recently used workflows to improve usability.",
      "These technologies may also support smoother course playback or navigation between learning surfaces.",
    ],
  },
  {
    title: "5. Managing cookies",
    body: [
      "Most browsers allow users to block, delete, or limit cookies through browser settings. Restricting some cookies may cause parts of Learnly to stop working correctly.",
      "Users can also clear browser storage or use privacy-focused browser settings, though doing so may sign them out or remove saved preferences.",
    ],
  },
  {
    title: "6. Contact",
    body: [
      "Questions about Learnly cookie use can be sent to support@learnly.app.",
      "This policy is general product guidance and should be reviewed by legal counsel before production launch.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <div className="premium-shell">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="premium-card rounded-[--radius-xl] p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex rounded-full bg-[--color-primary]/10 p-3 text-[--color-primary]">
              <Cookie className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-[--color-text-primary]">Cookie Policy</h1>
              <p className="mt-2 text-sm text-[--color-text-muted]">Last updated: June 17, 2026</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-[--color-text-secondary]">
            Learnly uses cookies and related technologies to keep the platform secure, maintain sessions, remember preferences, and understand product usage.
          </p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-heading text-2xl font-black text-[--color-text-primary]">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-[--color-text-secondary]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
            >
              Read privacy policy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
