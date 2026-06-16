"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Building2, ExternalLink, Image, Users, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface OrgStats {
  total_courses: number;
  total_members: number;
}

export default function OrgSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const [orgData, statsData] = await Promise.all([
          apiFetch<OrgData>(`/api/v1/orgs/${slug}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<OrgStats>(`/api/v1/orgs/${slug}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setOrg(orgData);
        setStats(statsData);
        setName(orgData.name);
        setLogoUrl(orgData.logo_url ?? "");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken, slug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      const updated = await apiFetch<OrgData>(`/api/v1/orgs/${slug}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, logo_url: logoUrl || null }),
      });
      setOrg(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-3xl font-black tracking-tight text-[--color-text-primary]">
        Settings
      </h1>
      <p className="mb-8 text-sm text-[--color-text-muted]">
        Manage your organization&apos;s branding and configuration.
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[--radius-lg]" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Branding */}
          <form onSubmit={handleSave} className="premium-card rounded-[--radius-lg] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                <Building2 className="h-4 w-4 text-[--color-primary]" />
              </div>
              <h2 className="font-semibold text-[--color-text-primary]">Branding</h2>
            </div>

            {error && (
              <p className="mb-4 rounded-[--radius-md] bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
                  Organization Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
                  <span className="flex items-center gap-1.5">
                    <Image className="h-3.5 w-3.5" />
                    Logo URL
                  </span>
                </label>
                <Input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-8 w-8 rounded object-contain border border-[--color-border]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="text-xs text-[--color-text-muted]">Preview</span>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]">
                  Slug
                </label>
                <Input value={org?.slug ?? slug} disabled className="bg-[--color-surface]" />
                <p className="mt-1 text-xs text-[--color-text-muted]">
                  Slug is read-only — contact support to change it.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" disabled={saving} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              {saved && (
                <span className="text-sm font-medium text-green-600">Saved!</span>
              )}
            </div>
          </form>

          {/* Seat management */}
          <div className="premium-card rounded-[--radius-lg] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                <Users className="h-4 w-4 text-[--color-primary]" />
              </div>
              <h2 className="font-semibold text-[--color-text-primary]">Members &amp; Seats</h2>
            </div>
            <div className="flex items-center justify-between rounded-[--radius-md] bg-[--color-surface] px-4 py-3">
              <div>
                <p className="text-2xl font-bold text-[--color-text-primary]">
                  {stats?.total_members ?? "—"}
                </p>
                <p className="text-xs text-[--color-text-muted]">Current members</p>
              </div>
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-[--radius-md] border border-[--color-border] bg-white px-3 py-2 text-sm font-medium text-[--color-text-secondary] transition-colors hover:border-[--color-primary]/50 hover:text-[--color-primary]"
              >
                Manage Members
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="mt-3 text-xs text-[--color-text-muted]">
              Invite, remove, and manage member roles from your Clerk organization dashboard.
            </p>
          </div>

          {/* SSO */}
          <div className="premium-card rounded-[--radius-lg] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                <svg
                  className="h-4 w-4 text-[--color-primary]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-[--color-text-primary]">Single Sign-On</h2>
            </div>
            <p className="mb-4 text-sm text-[--color-text-muted]">
              Configure SAML or OIDC SSO for your organization via Clerk. Once enabled, members can
              sign in with your identity provider.
            </p>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 text-sm font-medium text-[--color-primary] hover:underline"
            >
              Configure SSO in Clerk Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Billing */}
          <div className="premium-card rounded-[--radius-lg] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                <svg
                  className="h-4 w-4 text-[--color-primary]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h2 className="font-semibold text-[--color-text-primary]">Billing</h2>
            </div>
            <p className="text-sm text-[--color-text-muted]">
              Manage your subscription plan and invoices. Contact your Learnly account manager for
              enterprise billing options.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-[--radius-md] bg-[--color-surface] px-3 py-2 text-sm">
              <span className="font-medium text-[--color-text-primary]">Current plan:</span>
              <span className="rounded-full bg-[--color-primary-subtle] px-2 py-0.5 text-xs font-semibold text-[--color-primary]">
                Team
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
