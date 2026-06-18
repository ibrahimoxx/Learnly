import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Learnly",
  description: "Learnly Terms of Service covering user responsibilities, instructor content, payments, refunds, prohibited conduct, and platform limitations.",
};

const sections = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By accessing or using Learnly, you agree to these Terms of Service. If you do not agree, do not use the platform.",
      "Some features may also be subject to additional terms, policies, or product rules.",
    ],
  },
  {
    title: "2. Accounts",
    body: [
      "Users are responsible for providing accurate information, protecting account credentials, and complying with platform rules.",
      "Learnly may suspend or terminate accounts that violate these terms, create risk, or are used in abusive, fraudulent, or unlawful ways.",
    ],
  },
  {
    title: "3. Marketplace model",
    body: [
      "Learnly operates an online course marketplace where learners can discover and purchase educational content and approved instructors can publish courses.",
      "Instructors remain responsible for the accuracy, legality, and ownership of the content they upload or distribute through the platform.",
    ],
  },
  {
    title: "4. Payments and refunds",
    body: [
      "Prices, currencies, discounts, taxes, and payment methods may vary by offer, geography, and payment provider.",
      "Purchases are processed through third-party payment services such as Stripe. Learnly may update pricing or offers at any time before purchase.",
      "Refund eligibility is governed by Learnly refund rules, course usage, and any applicable local law.",
    ],
  },
  {
    title: "5. Instructor content and ownership",
    body: [
      "Instructors retain ownership of their content, subject to the licenses they grant to Learnly and enrolled learners for hosting, display, access, and delivery.",
      "By submitting content, instructors represent that they have all rights needed to publish it and that it does not infringe the rights of others.",
    ],
  },
  {
    title: "6. Prohibited conduct",
    body: [
      "Users may not misuse the platform, attempt unauthorized access, scrape protected data, upload unlawful or infringing material, interfere with service availability, or engage in fraud, harassment, or abuse.",
      "Users may not copy, redistribute, or resell course content except where clearly permitted by Learnly or the relevant rights holder.",
    ],
  },
  {
    title: "7. Availability and changes",
    body: [
      "Learnly may change, pause, or discontinue features, content, pricing, or parts of the service at any time.",
      "We do not guarantee uninterrupted availability, full compatibility with every device, or that every course will remain available permanently.",
    ],
  },
  {
    title: "8. Disclaimers and liability",
    body: [
      "The platform and course content are provided on an as-is and as-available basis without warranties of any kind except where warranties cannot be excluded by law.",
      "To the fullest extent permitted by law, Learnly is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost revenue, profits, data, or goodwill arising from use of the service.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about these terms can be sent to support@learnly.app.",
      "These terms are a practical operating draft and should be reviewed by legal counsel before production use.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="premium-shell">
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="premium-card rounded-[--radius-xl] p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex rounded-full bg-[--color-primary]/10 p-3 text-[--color-primary]">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-[--color-text-primary]">Terms of Service</h1>
              <p className="mt-2 text-sm text-[--color-text-muted]">Last updated: June 17, 2026</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-[--color-text-secondary]">
            These Terms of Service govern access to and use of the Learnly platform by learners, instructors, organizations, and visitors.
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
            Legal review still required before production launch.
          </div>

          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full bg-[--color-primary] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[--color-primary-hover]"
            >
              View pricing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
