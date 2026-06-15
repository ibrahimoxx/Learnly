import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Users,
  LayoutDashboard,
  Tag,
  Link2,
  ArrowLeft,
  FolderTree,
  Building2,
  Flag,
  LineChart,
  Wallet,
  Megaphone,
  LifeBuoy,
} from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin") redirect("/");

  return (
    <div className="premium-shell flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-white/60 bg-[--color-surface-glass] shadow-[var(--shadow-sm)] backdrop-blur-xl">
        <div className="flex h-16 items-center border-b border-white/60 px-5">
          <span className="font-heading text-xl font-black text-[--color-text-primary]">Admin Panel</span>
        </div>
        <nav className="p-3 space-y-1">
          <Link
            href="/"
            className="mb-2 flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2 text-sm font-extrabold text-[--color-text-muted] transition-colors hover:bg-[--color-primary-subtle] hover:text-[--brand-800]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          {[
            { href: "/admin", label: "Overview", icon: LayoutDashboard },
            { href: "/admin/courses", label: "Courses", icon: BookOpen },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/coupons", label: "Coupons", icon: Tag },
            { href: "/admin/affiliates", label: "Affiliates", icon: Link2 },
            { href: "/admin/categories", label: "Categories", icon: FolderTree },
            { href: "/admin/orgs", label: "Organizations", icon: Building2 },
            { href: "/admin/flags", label: "Feature Flags", icon: Flag },
            { href: "/admin/revenue", label: "Revenue", icon: LineChart },
            { href: "/admin/payouts", label: "Payouts", icon: Wallet },
            { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
            { href: "/admin/support", label: "Support", icon: LifeBuoy },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2 text-sm font-extrabold text-[--color-text-secondary] transition-colors hover:bg-[--color-primary-subtle] hover:text-[--brand-800]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
