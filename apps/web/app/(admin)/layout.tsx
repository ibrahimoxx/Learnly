import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, LayoutDashboard, Tag, Link2 } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-[--color-border] bg-white">
        <div className="flex h-16 items-center border-b border-[--color-border] px-5">
          <span className="font-bold text-[--color-text-primary]">Admin Panel</span>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { href: "/admin", label: "Overview", icon: LayoutDashboard },
            { href: "/admin/courses", label: "Courses", icon: BookOpen },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/coupons", label: "Coupons", icon: Tag },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-[--radius-sm] px-3 py-2 text-sm font-medium text-[--color-text-secondary] hover:bg-[--color-surface] hover:text-[--color-text-primary] transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-[--color-surface] overflow-auto">{children}</main>
    </div>
  );
}
