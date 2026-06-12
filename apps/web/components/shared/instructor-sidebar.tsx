"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, BarChart2, Tag, DollarSign, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/instructor/courses",    label: "My Courses",  icon: BookOpen },
  { href: "/instructor/paths",      label: "Paths",       icon: BarChart2 },
  { href: "/instructor/promotions", label: "Promotions",  icon: Tag },
  { href: "/instructor/affiliate",  label: "Affiliate",   icon: Link2 },
  { href: "/instructor/payouts",    label: "Payouts",     icon: DollarSign },
];

export function InstructorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-60 shrink-0 border-r border-white/60 bg-[--color-surface-glass] pb-10 pt-6 shadow-[var(--shadow-sm)] backdrop-blur-xl lg:block">
      <p className="px-5 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[--color-text-muted]">
        Instructor
      </p>
      <nav className="flex flex-col gap-0.5 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2.5 text-sm font-extrabold transition-all",
                active
                  ? "bg-[--color-primary-subtle] text-[--brand-800] shadow-[var(--shadow-sm)]"
                  : "text-[--color-text-secondary] hover:bg-[--color-surface-raised] hover:text-[--color-text-primary] hover:shadow-[var(--shadow-xs)]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-[--color-primary]" : "text-[--color-text-muted]")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
