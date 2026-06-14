"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertCircle, Save, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountSubnav } from "@/components/shared/account-subnav";
import { apiFetch } from "@/lib/api";
import type { UserAccount, UserAccountUpdate } from "@/types";

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Africa/Casablanca",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  bio: z.string().max(1000, "Bio must be 1000 characters or fewer").optional().or(z.literal("")),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  image_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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

function ProfileSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-9 w-40" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="premium-card mt-6 flex flex-col items-center gap-3 rounded-[--radius-lg] py-12 text-center">
      <AlertCircle className="h-10 w-10 text-[--color-error]" />
      <p className="font-extrabold text-[--color-text-secondary]">Couldn&apos;t load your profile</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

export default function EditProfilePage() {
  const { getToken } = useAuth();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      bio: "",
      website: "",
      image_url: "",
      timezone: "",
    },
  });

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const token = await getToken();
      const data = await apiFetch<UserAccount>("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccount(data);
      reset({
        first_name: data.first_name,
        last_name: data.last_name,
        bio: data.bio ?? "",
        website: data.website ?? "",
        image_url: data.image_url ?? "",
        timezone: data.timezone ?? "",
      });
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

  async function onSubmit(values: ProfileFormValues) {
    setSaving(true);
    try {
      const token = await getToken();
      const payload: UserAccountUpdate = {
        first_name: values.first_name,
        last_name: values.last_name,
        bio: values.bio || "",
        website: values.website || "",
        image_url: values.image_url || "",
        timezone: values.timezone || "",
      };
      const updated = await apiFetch<UserAccount>("/api/v1/users/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setAccount(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Couldn't save your profile. Try again."));
    } finally {
      setSaving(false);
    }
  }

  const previewImage = watch("image_url");
  const initials = account ? `${account.first_name[0] ?? ""}${account.last_name[0] ?? ""}`.toUpperCase() : "";

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Account settings
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary]">Edit profile</h1>
        <p className="mt-2 text-[--color-text-secondary]">
          Update how you appear to instructors and other students on Skillforge.
        </p>

        <div className="mt-8">
          <AccountSubnav />
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : error || !account ? (
          <ErrorState onRetry={load} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
            <div className="premium-card rounded-[--radius-lg] p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={previewImage || account.image_url || undefined} alt={account.first_name} />
                  <AvatarFallback className="text-xl">{initials || <UserIcon className="h-8 w-8" />}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-extrabold text-[--color-text-primary]">
                    {account.first_name} {account.last_name}
                  </p>
                  <p className="text-sm text-[--color-text-secondary]">{account.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-[--color-text-muted]">{account.role}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Label htmlFor="image_url">Profile photo URL</Label>
                <Input id="image_url" placeholder="https://..." {...register("image_url")} />
                {errors.image_url ? (
                  <p className="text-sm text-[--color-error]">{errors.image_url.message}</p>
                ) : (
                  <p className="text-xs text-[--color-text-muted]">Paste a link to an image hosted elsewhere.</p>
                )}
              </div>
            </div>

            <div className="premium-card grid gap-6 rounded-[--radius-lg] p-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" {...register("first_name")} />
                {errors.first_name ? <p className="text-sm text-[--color-error]">{errors.first_name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" {...register("last_name")} />
                {errors.last_name ? <p className="text-sm text-[--color-error]">{errors.last_name.message}</p> : null}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} placeholder="Tell students a bit about yourself" {...register("bio")} />
                {errors.bio ? <p className="text-sm text-[--color-error]">{errors.bio.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://..." {...register("website")} />
                {errors.website ? <p className="text-sm text-[--color-error]">{errors.website.message}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  {...register("timezone")}
                  className="flex h-10 w-full rounded border border-[--color-border] bg-[--color-surface-raised] px-3 py-2 text-sm text-[--color-text-primary] focus:outline-none focus:ring-2 focus:ring-[--brand-400] focus:border-transparent"
                >
                  <option value="">Not set</option>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="secondary">
                  Back to My Learning
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
