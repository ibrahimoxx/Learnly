import Link from "next/link";
import { LayoutDashboard, Activity, BookMarked, Settings } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const NAV = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/paths", label: "Learning Paths", icon: BookMarked },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function OrgAdminLayout({ children, params }: Props) {
  const { slug } = await params;

  return (
    <>
      <div className="border-b border-[--color-border] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl gap-0.5 overflow-x-auto px-4 sm:px-6">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={`/orgs/${slug}/admin${href}`}
              className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-[--color-text-secondary] transition-colors hover:border-[--color-primary]/50 hover:text-[--color-primary]"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </>
  );
}
