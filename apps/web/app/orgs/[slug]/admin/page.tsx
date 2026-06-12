import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BookOpen, Users, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Props {
  params: Promise<{ slug: string }>;
}

interface OrgStats {
  total_courses: number;
  total_members: number;
}

export const metadata: Metadata = { title: "Org Admin" };

async function getOrgStats(slug: string): Promise<OrgStats> {
  try {
    return await apiFetch<OrgStats>(`/api/v1/orgs/${slug}/stats`);
  } catch {
    return { total_courses: 0, total_members: 0 };
  }
}

export default async function OrgAdminPage({ params }: Props) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user) redirect(`/orgs/${slug}`);

  const role = user.publicMetadata?.role as string | undefined;
  const orgRole = (user as unknown as { organizationMemberships?: Array<{ role: string }> }).organizationMemberships?.[0]?.role;

  if (role !== "admin" && orgRole !== "org:admin") {
    redirect(`/orgs/${slug}`);
  }

  const stats = await getOrgStats(slug);

  const cards = [
    {
      icon: BookOpen,
      label: "Courses",
      value: stats.total_courses,
      href: `/orgs/${slug}/courses`,
    },
    {
      icon: Users,
      label: "Members",
      value: stats.total_members,
      href: "#",
    },
    {
      icon: TrendingUp,
      label: "Active today",
      value: "—",
      href: "#",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[--color-text-primary]">Organization Admin</h1>
      <p className="mt-1 text-sm text-[--color-text-muted]">Manage your organization&apos;s learning environment.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-4 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-5 hover-lift hover:border-[--color-primary]/40 shadow-[var(--shadow-xs)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary]/10">
              <Icon className="h-5 w-5 text-[--color-primary]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[--color-text-primary]">{value}</p>
              <p className="text-sm text-[--color-text-muted]">{label}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Settings shortcut */}
      <div className="mt-8 rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-6 shadow-[var(--shadow-xs)]">
        <h2 className="font-semibold text-[--color-text-primary]">Organization Settings</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Manage branding, SSO, and seat configuration from your Clerk organization dashboard.
        </p>
        <a
          href="https://dashboard.clerk.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-[--color-primary] hover:underline"
        >
          Open Clerk dashboard →
        </a>
      </div>
    </div>
  );
}
