"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Heart, Gift, Bell, Trophy, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard",          label: "My Learning",    icon: BookOpen },
  { href: "/wishlist",           label: "Wishlist",        icon: Heart },
  { href: "/gifts",              label: "Gifts",           icon: Gift },
  { href: "/notifications",      label: "Notifications",   icon: Bell },
  { href: "/achievements",       label: "Achievements",    icon: Trophy },
  { href: "/user/edit-profile",  label: "Account",         icon: UserCog },
];

export function StudentSidebar() {
  const pathname = usePathname();

  // Hide on the full-screen player page
  if (pathname.includes("/learn/")) return null;

  return (
    <aside className="hidden min-h-screen w-56 shrink-0 border-r border-white/60 bg-[--color-surface-glass] pb-10 pt-6 shadow-[var(--shadow-sm)] backdrop-blur-xl lg:block">
      <p className="px-5 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[--color-text-muted]">
        My Account
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
