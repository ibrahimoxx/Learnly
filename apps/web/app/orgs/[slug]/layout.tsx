import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

async function getOrg(slug: string): Promise<OrgData | null> {
  try {
    return await apiFetch<OrgData>(`/api/v1/orgs/${slug}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrg(slug);
  return { title: org ? `${org.name} | Learnly` : "Organization" };
}

export default async function OrgLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await getOrg(slug);

  if (!org) notFound();

  return (
    <div className="min-h-screen bg-[--color-surface]">
      {/* Org header */}
      <header className="border-b border-[--color-border] bg-[--color-surface-raised]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {org.logo_url ? (
            <Image src={org.logo_url} alt={org.name} width={32} height={32} className="rounded object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[--color-primary]/10">
              <Building2 className="h-4 w-4 text-[--color-primary]" />
            </div>
          )}
          <Link
            href={`/orgs/${slug}`}
            className="text-sm font-semibold text-[--color-text-primary] hover:text-[--color-primary]"
          >
            {org.name}
          </Link>
          <nav className="ml-4 flex items-center gap-1">
            <Link
              href={`/orgs/${slug}/courses`}
              className="px-3 py-1.5 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary]"
            >
              Courses
            </Link>
            <Link
              href={`/orgs/${slug}/admin`}
              className="px-3 py-1.5 text-sm text-[--color-text-secondary] hover:text-[--color-text-primary]"
            >
              Admin
            </Link>
          </nav>
          <div className="ml-auto text-xs text-[--color-text-muted]">
            Powered by <span className="font-medium text-[--color-primary]">Learnly</span>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
