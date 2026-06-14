"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, CreditCard, Receipt, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/user/edit-profile", label: "Profile", icon: User },
  { href: "/user/edit-profile/privacy", label: "Privacy", icon: Lock },
  { href: "/user/edit-profile/payment-methods", label: "Payment methods", icon: CreditCard },
  { href: "/user/edit-profile/purchase-history", label: "Purchase history", icon: Receipt },
  { href: "/user/edit-profile/subscriptions", label: "Subscription", icon: Sparkles },
  { href: "/user/edit-profile/messages", label: "Messages", icon: MessageSquare },
];

export function AccountSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[--color-border]">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = href === "/user/edit-profile" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-extrabold transition-all",
              active
                ? "border-[--color-primary] text-[--color-primary]"
                : "border-transparent text-[--color-text-secondary] hover:text-[--color-text-primary]"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
