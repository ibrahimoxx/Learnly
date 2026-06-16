"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, PlayCircle, CreditCard, Award, MessageCircle, Settings, ChevronRight, Search } from "lucide-react";

const CATEGORIES = [
  {
    icon: BookOpen,
    title: "Getting Started",
    desc: "Account setup, enrollment, and your first course",
    articles: ["How to enroll in a course", "Navigating the course player", "Setting up your profile"],
  },
  {
    icon: PlayCircle,
    title: "Learning & Courses",
    desc: "Video playback, quizzes, progress tracking",
    articles: ["Resuming a course", "Quiz and coding exercises", "Downloading certificates"],
  },
  {
    icon: CreditCard,
    title: "Payments & Billing",
    desc: "Purchases, refunds, and invoice downloads",
    articles: ["Accepted payment methods", "How to request a refund", "Download your invoice"],
  },
  {
    icon: Award,
    title: "Certificates",
    desc: "Earning, sharing, and verifying certificates",
    articles: ["When do I get my certificate?", "Add certificate to LinkedIn", "Verify a certificate"],
  },
  {
    icon: MessageCircle,
    title: "Instructors & Q&A",
    desc: "Asking questions and messaging instructors",
    articles: ["How to ask a question", "Contact your instructor", "Course announcements"],
  },
  {
    icon: Settings,
    title: "Account & Settings",
    desc: "Password, notifications, privacy controls",
    articles: ["Change your email or password", "Notification preferences", "Delete your account"],
  },
] as const;

const FAQS = [
  { q: "How do I enroll in a course?", a: "Browse the course catalog, open any course detail page, and click Enroll or Buy. Free courses enroll instantly; paid courses go through the checkout." },
  { q: "Can I watch videos offline?", a: "Offline viewing is not yet supported. All videos stream directly from our platform — an internet connection is required." },
  { q: "How do I get my certificate?", a: "Complete 100% of the course lessons. Your certificate is generated automatically and appears in My Learning → Certificates." },
  { q: "How do I contact an instructor?", a: "Open the course player, go to the Q&A tab, and post a question on any lesson. Instructors are notified by email and reply in the thread." },
  { q: "What is the refund policy?", a: "Requests within 30 days of purchase and under 30% course completion qualify for a full refund. Go to My Purchases → Request Refund." },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();

  const filteredCategories = q
    ? CATEGORIES.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.desc.toLowerCase().includes(q) ||
          c.articles.some((a) => a.toLowerCase().includes(q))
      )
    : CATEGORIES;

  const filteredFaqs = q
    ? FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
    : FAQS;

  return (
    <div className="min-h-screen" style={{ background: "#f7f9fa" }}>

      {/* Hero */}
      <div
        className="flex flex-col items-center py-16 px-4 text-center"
        style={{ background: "linear-gradient(135deg,#1c4ed8 0%,#6d28d9 100%)" }}
      >
        <h1 className="text-3xl font-black text-white sm:text-4xl">How can we help?</h1>
        <p className="mt-2 text-base text-blue-100">Search our knowledge base or browse categories below.</p>
        <div className="relative mt-6 w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for answers…"
            className="w-full rounded-full py-3 pl-11 pr-5 text-sm text-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ background: "#ffffff" }}
          />
        </div>
        {q && (
          <p className="mt-3 text-sm text-blue-100">
            {filteredCategories.length + filteredFaqs.length === 0
              ? "No results found."
              : `${filteredCategories.length} topic${filteredCategories.length !== 1 ? "s" : ""} · ${filteredFaqs.length} FAQ${filteredFaqs.length !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Categories */}
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-lg font-bold" style={{ color: "#1c1d1f" }}>Browse by topic</h2>
        {filteredCategories.length === 0 && q ? (
          <p className="text-sm" style={{ color: "#6a6f73" }}>No topics match your search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map(({ icon: Icon, title, desc, articles }) => (
              <div
                key={title}
                className="rounded-xl bg-white p-5 transition-shadow hover:shadow-md"
                style={{ border: "1px solid #d1d7dc" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "#eaf1fb" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "#0056d2" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#1c1d1f" }}>{title}</p>
                    <p className="text-[11px]" style={{ color: "#6a6f73" }}>{desc}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {articles.map((a) => (
                    <li key={a}>
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "#0056d2" }}>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="mb-6 text-lg font-bold" style={{ color: "#1c1d1f" }}>Frequently asked questions</h2>
        {filteredFaqs.length === 0 && q ? (
          <p className="text-sm" style={{ color: "#6a6f73" }}>No FAQs match your search.</p>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map(({ q: question, a }) => (
              <details
                key={question}
                className="group rounded-xl bg-white px-5 py-4 transition-shadow open:shadow-sm"
                style={{ border: "1px solid #d1d7dc" }}
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold list-none" style={{ color: "#1c1d1f" }}>
                  {question}
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" style={{ color: "#6a6f73" }} />
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "#6a6f73" }}>{a}</p>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Contact CTA */}
      <div className="border-t py-12 text-center" style={{ borderColor: "#d1d7dc", background: "#ffffff" }}>
        <p className="text-base font-bold" style={{ color: "#1c1d1f" }}>Still need help?</p>
        <p className="mt-1 text-sm" style={{ color: "#6a6f73" }}>Our support team is available Monday–Friday, 9 am–6 pm CET.</p>
        <Link
          href="mailto:support@learnly.app"
          className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white"
          style={{ background: "#0056d2" }}
        >
          <MessageCircle className="h-4 w-4" />
          Contact support
        </Link>
      </div>
    </div>
  );
}
