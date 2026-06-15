"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/instructor/communication/announcements", label: "Announcements" },
  { href: "/instructor/communication/direct-messages", label: "Direct Messages" },
  { href: "/instructor/communication/assignments", label: "Assignments" },
];

export default function InstructorCommunicationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight text-[--color-text-primary]">Communication</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">
        Reach your students with announcements, direct messages, and assignment feedback.
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
