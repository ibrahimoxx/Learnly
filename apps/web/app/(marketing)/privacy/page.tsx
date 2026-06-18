import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Learnly",
  description: "Learnly Privacy Policy covering account data, course activity, payments, cookies, analytics, and user privacy rights.",
};

const sections = [
  {
    title: "1. Information we collect",
    body: [
      "We collect account details such as name, email address, authentication identifiers, and profile information you choose to add.",
      "We collect course activity data such as enrollments, lesson progress, quiz attempts, certificates, support requests, and instructor application details.",
      "For purchases, payment details are processed by third-party payment providers such as Stripe. Learnly may store limited transaction records such as purchase amount, currency, and payment status, but not full card numbers.",
    ],
  },
  {
    title: "2. How we use information",
    body: [
      "We use personal data to operate the platform, provide access to courses, process purchases, respond to support requests, and improve product quality.",
      "Course activity data helps us show progress, generate certificates, personalize recommendations, and support instructors in managing their content.",
      "We may also use information to detect abuse, secure accounts, comply with legal obligations, and communicate important service notices.",
    ],
  },
  {
    title: "3. Cookies and similar technologies",
    body: [
      "Learnly uses cookies and similar technologies for authentication, session continuity, security, remembering preferences, and measuring product usage.",
      "Authentication and account session handling may rely on providers such as Clerk. Product analytics may use tools such as PostHog when enabled by Learnly.",
      "For more detail about cookie categories and user controls, see the Cookie Policy.",
    ],
  },
  {
    title: "4. Sharing information",
    body: [
      "We may share data with service providers that support hosting, authentication, analytics, email delivery, customer support, and payment processing.",
      "We may share limited course and transaction context with instructors when needed to deliver purchased learning experiences or handle learner support.",
      "We may disclose information when required by law, to enforce our terms, or to protect the rights, safety, and security of Learnly, users, and the public.",
    ],
  },
  {
    title: "5. Data retention",
    body: [
      "We retain information for as long as needed to provide the service, maintain records, resolve disputes, and comply with legal, tax, or security obligations.",
      "Retention periods may vary based on the type of data involved, whether an account is active, and whether a user has made purchases or submitted content.",
    ],
  },
  {
    title: "6. Your choices and rights",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, or export certain personal information, and to object to or restrict some processing.",
      "You can also manage profile settings, communication preferences, and certain privacy options inside your account where those controls are available.",
      "Legal rights vary by jurisdiction. Learnly may request identity verification before processing certain privacy requests.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information, but no method of storage or transmission is completely secure.",
      "Users are responsible for keeping account credentials safe and notifying Learnly if they believe an account has been compromised.",
    ],
  },
  {
    title: "8. Contact",
    body: [
      "Questions about this Privacy Policy or privacy requests can be sent to support@learnly.app.",
      "This policy is general product guidance only and should be reviewed by legal counsel before production launch.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="premium-shell">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="premium-card rounded-[--radius-xl] p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex rounded-full bg-[--color-primary]/10 p-3 text-[--color-primary]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-[--color-text-primary]">Privacy Policy</h1>
              <p className="mt-2 text-sm text-[--color-text-muted]">Last updated: June 17, 2026</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-[--color-text-secondary]">
            This Privacy Policy explains how Learnly collects, uses, stores, and shares information when people use the Learnly platform. It is intended as a practical policy draft and does not replace formal legal review.
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

          <div className="mt-10 rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface] p-5 text-sm text-[--color-text-secondary]">
            Formal legal review still required before production launch.
          </div>

          <div className="mt-8">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
            >
              Contact support
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
