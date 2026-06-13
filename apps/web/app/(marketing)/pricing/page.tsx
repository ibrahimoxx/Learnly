import Link from "next/link";
import type { Metadata } from "next";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Pricing — Learnly",
  description: "Plans for individual learners and teams. Buy courses one at a time, or give your whole organization access to the Learnly catalog.",
};

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "Individual",
    price: "$0",
    period: "to join",
    description: "Buy courses one at a time and learn at your own pace.",
    features: [
      "Lifetime access to purchased courses",
      "Certificates of completion",
      "Course Q&A and discussions",
      "Mobile + offline access (PWA)",
      "Wishlist and progress tracking",
    ],
    cta: "Get started",
    href: "/sign-up",
  },
  {
    name: "Team",
    price: "$24",
    period: "per user / month",
    description: "Give your team unlimited access to the full Learnly catalog.",
    features: [
      "Unlimited access to all courses",
      "Team progress dashboard",
      "Assign learning paths",
      "Centralized billing",
      "Priority support",
    ],
    cta: "Start team trial",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Business",
    price: "Custom",
    description: "Advanced controls, security, and support for large organizations.",
    features: [
      "Everything in Team",
      "SSO and SCIM provisioning",
      "Custom learning paths & branding",
      "Advanced analytics & reporting",
      "Dedicated account manager",
    ],
    cta: "Contact sales",
    href: "mailto:sales@learnly.app?subject=Business%20plan%20inquiry",
  },
];

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes. Individuals can upgrade to a Team plan at any time, and Team plans can be upgraded to Business as your organization grows.",
  },
  {
    q: "How does billing work for Team plans?",
    a: "Team plans are billed monthly per active seat. You can add or remove seats at any time from your organization dashboard.",
  },
  {
    q: "Do instructors get paid the same way on every plan?",
    a: "Yes. Instructor payouts follow the same revenue-share model regardless of which plan a learner is on.",
  },
  {
    q: "Is there a free trial for Team plans?",
    a: "Yes, every Team plan starts with a 14-day free trial with full access to the catalog — no credit card required to start.",
  },
];

export default function PricingPage() {
  return (
    <div className="premium-shell">
      {/* Hero */}
      <section className="mesh-panel relative overflow-hidden text-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[--brand-300]" />
            Simple, transparent pricing
          </span>
          <h1 className="animate-fade-up mt-5 font-heading text-4xl font-black tracking-tight sm:text-5xl">
            Pricing that grows <span className="text-gradient-brand">with you</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-4 max-w-2xl text-base text-white/74 sm:text-lg">
            Learn one course at a time, or unlock the entire catalog for your whole team.
            No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlighted
                  ? "hover-lift relative flex flex-col rounded-[--radius-xl] border-2 border-[--color-primary] bg-[image:var(--gradient-brand)] p-8 text-white shadow-[var(--shadow-brand)]"
                  : "hover-lift premium-card relative flex flex-col rounded-[--radius-xl] p-8"
              }
            >
              {plan.highlighted && (
                <span className="absolute -top-3 right-6 rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[--color-primary] shadow-[var(--shadow-md)]">
                  Most popular
                </span>
              )}

              <h2 className={`font-heading text-xl font-black ${plan.highlighted ? "text-white" : "text-[--color-text-primary]"}`}>
                {plan.name}
              </h2>
              <p className={`mt-1 text-sm ${plan.highlighted ? "text-white/80" : "text-[--color-text-secondary]"}`}>
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-heading text-4xl font-black tracking-tight">{plan.price}</span>
                {plan.period && (
                  <span className={`text-sm font-semibold ${plan.highlighted ? "text-white/74" : "text-[--color-text-muted]"}`}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-white" : "text-[--color-success]"}`}
                    />
                    <span className={plan.highlighted ? "text-white/90" : "text-[--color-text-secondary]"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href} className="mt-8">
                <Button
                  className="w-full"
                  size="lg"
                  variant={plan.highlighted ? "secondary" : "default"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="animate-fade-up text-center font-heading text-3xl font-black tracking-tight text-[--color-text-primary]">
          Frequently asked questions
        </h2>
        <div className="premium-card mt-8 rounded-[--radius-lg] px-6 py-2">
          <Accordion type="single" collapsible>
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left font-bold">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[--color-text-secondary]">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mesh-panel animate-fade-up overflow-hidden rounded-[--radius-xl] px-8 py-12 text-center text-white shadow-[var(--shadow-xl)] sm:px-16">
          <h2 className="font-heading text-2xl font-black sm:text-3xl">Ready to start learning?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/74">
            Join thousands of students and instructors building skills on Learnly.
          </p>
          <Link href="/courses" className="mt-6 inline-block">
            <Button size="lg" variant="secondary">Browse courses</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
