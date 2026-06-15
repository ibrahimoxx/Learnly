"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/instructor/performance/overview", label: "Overview" },
  { href: "/instructor/performance/students", label: "Students" },
  { href: "/instructor/performance/reviews", label: "Reviews" },
  { href: "/instructor/performance/engagement", label: "Engagement" },
  { href: "/instructor/performance/traffic", label: "Traffic" },
];

export default function InstructorPerformanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight text-[--color-text-primary]">Performance</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        Track revenue, students, reviews, engagement and traffic across your courses.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-[--color-border] pb-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[--radius-sm] px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[--color-primary] text-white"
                  : "text-[--color-text-secondary] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
