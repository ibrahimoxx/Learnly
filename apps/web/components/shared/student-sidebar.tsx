"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Heart, Bell, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard",      label: "My Learning",    icon: BookOpen },
  { href: "/wishlist",       label: "Wishlist",        icon: Heart },
  { href: "/notifications",  label: "Notifications",   icon: Bell },
  { href: "/achievements",   label: "Achievements",    icon: Trophy },
];

export function StudentSidebar() {
  const pathname = usePathname();

  // Hide on the full-screen player page
  if (pathname.includes("/learn/")) return null;

  return (
    <aside className="w-52 shrink-0 border-r border-neutral-200 bg-white min-h-screen pt-6 pb-10 hidden lg:block">
      <p className="px-5 mb-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
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
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-violet-600" : "text-neutral-400")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
