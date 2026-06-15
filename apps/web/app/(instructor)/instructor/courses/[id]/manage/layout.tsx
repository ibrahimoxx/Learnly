"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "goals", label: "Goals" },
  { href: "captions", label: "Captions" },
  { href: "accessibility", label: "Accessibility" },
  { href: "pricing", label: "Pricing" },
  { href: "communications/welcome", label: "Messages" },
  { href: "co-instructors", label: "Co-Instructors" },
  { href: "review/submit", label: "Submit for Review" },
];

export default function CourseManageLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/instructor/courses/${id}/edit`}
          className="text-[--color-text-muted] hover:text-[--color-text-primary]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-[--color-text-primary]">Course Setup</h1>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-[--color-border] pb-3">
        {TABS.map((tab) => {
          const href = `/instructor/courses/${id}/manage/${tab.href}`;
          const active = pathname === href;
          return (
            <Link
              key={tab.href}
              href={href}
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
