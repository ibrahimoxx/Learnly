"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSubnav } from "@/components/shared/account-subnav";
import { apiFetch } from "@/lib/api";
import type { EmailNotificationPrefs, UserPrivacy } from "@/types";

const NOTIFICATION_LABELS: Record<keyof EmailNotificationPrefs, { label: string; description: string }> = {
  enrollment: { label: "Enrollment confirmations", description: "When you enroll in a course." },
  qa_reply: { label: "Q&A replies", description: "When an instructor or student replies to your question." },
  review: { label: "Review activity", description: "When an instructor responds to your review." },
  gift: { label: "Gifts", description: "When you send or receive a gifted course." },
  announcement: { label: "Course announcements", description: "Updates from instructors of courses you're enrolled in." },
  message: { label: "Direct messages", description: "When you receive a new direct message." },
  marketing: { label: "Marketing & promotions", description: "Tips, offers, and product news from Skillforge." },
};

function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^\d+:\s*(.*)$/s);
  const body = match?.[1];
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return fallback;
  }
  return fallback;
}

function PrivacySkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="premium-card flex items-center justify-between rounded-[--radius-md] p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your privacy settings</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

export default function PrivacySettingsPage() {
  const { getToken } = useAuth();
  const [privacy, setPrivacy] = useState<UserPrivacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<UserPrivacy>("/api/v1/users/me/privacy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrivacy(data);
      setDirty(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleProfilePublic(value: boolean) {
    if (!privacy) return;
    setPrivacy({ ...privacy, is_profile_public: value });
    setDirty(true);
  }

  function toggleNotification(key: keyof EmailNotificationPrefs, value: boolean) {
    if (!privacy) return;
    setPrivacy({
      ...privacy,
      email_notification_prefs: { ...privacy.email_notification_prefs, [key]: value },
    });
    setDirty(true);
  }

  async function save() {
    if (!privacy) return;
    setSaving(true);
    try {
      const token = await getToken();
      const updated = await apiFetch<UserPrivacy>("/api/v1/users/me/privacy", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(privacy),
      });
      setPrivacy(updated);
      setDirty(false);
      toast.success("Privacy settings updated");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't save your settings. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Privacy</h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Control who can see your profile and which emails you receive from Skillforge.
        </p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <PrivacySkeleton />
        ) : error || !privacy ? (
          <ErrorState onRetry={load} />
        ) : (
          <div className="mt-8 space-y-6">
            <div className="premium-card rounded-[--radius-lg] p-6">
              <h2 className="font-extrabold text-[--color-text-primary]">Profile visibility</h2>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-[--radius-md] border border-[--color-border] p-4">
                <div>
                  <Label htmlFor="profile-public" className="font-semibold text-[--color-text-primary]">
                    Public instructor profile
                  </Label>
                  <p className="mt-1 text-sm text-[--color-text-secondary]">
                    Let other students and visitors view your public profile page.
                  </p>
                </div>
                <Switch
                  id="profile-public"
                  checked={privacy.is_profile_public}
                  onCheckedChange={toggleProfilePublic}
                />
              </div>
            </div>

            <div className="premium-card rounded-[--radius-lg] p-6">
              <h2 className="font-extrabold text-[--color-text-primary]">Email notifications</h2>
              <div className="mt-4 space-y-3">
                {(Object.keys(NOTIFICATION_LABELS) as Array<keyof EmailNotificationPrefs>).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-[--radius-md] border border-[--color-border] p-4"
                  >
                    <div>
                      <Label htmlFor={`pref-${key}`} className="font-semibold text-[--color-text-primary]">
                        {NOTIFICATION_LABELS[key].label}
                      </Label>
                      <p className="mt-1 text-sm text-[--color-text-secondary]">{NOTIFICATION_LABELS[key].description}</p>
                    </div>
                    <Switch
                      id={`pref-${key}`}
                      checked={privacy.email_notification_prefs[key]}
                      onCheckedChange={(value) => toggleNotification(key, value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={save} disabled={saving || !dirty}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Link href="/user/edit-profile">
                <Button type="button" variant="secondary">
                  Back to profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
