"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { CoInstructorRead, CoInstructorInvite, CoInstructorUpdate } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

const PERMISSIONS: { key: keyof CoInstructorUpdate; label: string; description: string }[] = [
  { key: "can_manage_content", label: "Manage content", description: "Edit curriculum, lessons, and course details" },
  { key: "can_respond_qa", label: "Respond to Q&A", description: "Answer student questions for this course" },
  { key: "can_respond_reviews", label: "Respond to reviews", description: "Reply to student reviews for this course" },
  { key: "can_view_revenue", label: "View revenue", description: "See this course's revenue and analytics" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[--color-primary]" : "bg-[--color-border]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function statusBadge(status: string) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-[--color-success]/10 px-2 py-0.5 text-xs font-medium text-[--color-success]">
        Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="rounded-full bg-[--color-primary]/10 px-2 py-0.5 text-xs font-medium text-[--color-primary]">
        Pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[--color-border] px-2 py-0.5 text-xs font-medium text-[--color-text-muted]">
      {status}
    </span>
  );
}

function CoInstructorRow({
  co,
  onUpdate,
  onRemove,
}: {
  co: CoInstructorRead;
  onUpdate: (id: string, update: CoInstructorUpdate) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [share, setShare] = useState(String(co.revenue_share_percent));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleToggle(key: keyof CoInstructorUpdate, value: boolean) {
    setSaving(true);
    try {
      await onUpdate(co.id, { [key]: value } as CoInstructorUpdate);
    } finally {
      setSaving(false);
    }
  }

  async function handleShareBlur() {
    const parsed = Number(share);
    if (Number.isNaN(parsed) || parsed === co.revenue_share_percent) return;
    const clamped = Math.min(100, Math.max(0, parsed));
    setShare(String(clamped));
    setSaving(true);
    try {
      await onUpdate(co.id, { revenue_share_percent: clamped });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await onRemove(co.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="premium-card rounded-[--radius-lg] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[--color-text-primary]">{co.name}</h3>
            {statusBadge(co.status)}
          </div>
          <p className="mt-0.5 text-sm text-[--color-text-muted]">{co.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={removing}
          className="text-[--color-error] hover:bg-[--color-error]/10"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          {removing ? "Removing…" : "Remove"}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {PERMISSIONS.map((perm) => (
          <div key={perm.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[--color-text-primary]">{perm.label}</p>
              <p className="text-xs text-[--color-text-muted]">{perm.description}</p>
            </div>
            <Toggle
              checked={Boolean(co[perm.key as keyof CoInstructorRead])}
              onChange={(value) => handleToggle(perm.key, value)}
            />
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 border-t border-[--color-border] pt-3">
          <div>
            <p className="text-sm font-medium text-[--color-text-primary]">Revenue share</p>
            <p className="text-xs text-[--color-text-muted]">Percentage of this course&apos;s net revenue</p>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={share}
              onChange={(e) => setShare(e.target.value)}
              onBlur={handleShareBlur}
              disabled={saving}
              className="w-20 text-right"
            />
            <span className="text-sm text-[--color-text-secondary]">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoInstructorsPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [coInstructors, setCoInstructors] = useState<CoInstructorRead[]>([]);
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState({
    can_manage_content: false,
    can_respond_qa: false,
    can_respond_reviews: false,
    can_view_revenue: false,
  });
  const [revenueShare, setRevenueShare] = useState("0");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    try {
      const data = await apiFetch<CoInstructorRead[]>(`/api/v1/instructor/courses/${id}/co-instructors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoInstructors(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { load(); }, [load]);

  async function handleInvite() {
    if (!email.trim()) {
      toast.error("Enter an email address.");
      return;
    }
    setInviting(true);
    try {
      const token = await getToken();
      const body: CoInstructorInvite = {
        email: email.trim(),
        ...permissions,
        revenue_share_percent: Math.min(100, Math.max(0, Number(revenueShare) || 0)),
      };
      const created = await apiFetch<CoInstructorRead>(`/api/v1/instructor/courses/${id}/co-instructors`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setCoInstructors((prev) => [created, ...prev]);
      setEmail("");
      setPermissions({
        can_manage_content: false,
        can_respond_qa: false,
        can_respond_reviews: false,
        can_view_revenue: false,
      });
      setRevenueShare("0");
      toast.success("Invitation sent.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setInviting(false);
    }
  }

  async function handleUpdate(coInstructorId: string, update: CoInstructorUpdate) {
    try {
      const token = await getToken();
      const updated = await apiFetch<CoInstructorRead>(
        `/api/v1/instructor/courses/${id}/co-instructors/${coInstructorId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(update),
        }
      );
      setCoInstructors((prev) => prev.map((co) => (co.id === coInstructorId ? updated : co)));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleRemove(coInstructorId: string) {
    try {
      const token = await getToken();
      await apiFetch<void>(`/api/v1/instructor/courses/${id}/co-instructors/${coInstructorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoInstructors((prev) => prev.filter((co) => co.id !== coInstructorId));
      toast.success("Co-instructor removed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (loading) {
    return <div className="h-6 w-48 animate-pulse rounded bg-[--color-border]" />;
  }

  return (
    <div className="space-y-6">
      <div className="premium-card rounded-[--radius-lg] p-6">
        <h2 className="font-semibold text-[--color-text-primary]">Invite a co-instructor</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Co-instructors must already have a Skillforge account. They&apos;ll get a notification to accept the
          invitation.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-[--color-text-secondary]">Email address</label>
          <Input
            type="email"
            placeholder="instructor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-4 space-y-3">
          {PERMISSIONS.map((perm) => (
            <div key={perm.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[--color-text-primary]">{perm.label}</p>
                <p className="text-xs text-[--color-text-muted]">{perm.description}</p>
              </div>
              <Toggle
                checked={permissions[perm.key as keyof typeof permissions]}
                onChange={(value) =>
                  setPermissions((prev) => ({ ...prev, [perm.key]: value }))
                }
              />
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-[--color-border] pt-3">
            <div>
              <p className="text-sm font-medium text-[--color-text-primary]">Revenue share</p>
              <p className="text-xs text-[--color-text-muted]">Percentage of this course&apos;s net revenue</p>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={revenueShare}
                onChange={(e) => setRevenueShare(e.target.value)}
                className="w-20 text-right"
              />
              <span className="text-sm text-[--color-text-secondary]">%</span>
            </div>
          </div>
        </div>

        <Button onClick={handleInvite} disabled={inviting} className="mt-4">
          <UserPlus className="mr-1.5 h-4 w-4" />
          {inviting ? "Sending…" : "Send invitation"}
        </Button>
      </div>

      {coInstructors.length === 0 ? (
        <div className="premium-card rounded-[--radius-lg] p-6 text-center">
          <p className="text-sm text-[--color-text-muted]">
            No co-instructors yet. Invite someone to help manage this course.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {coInstructors.map((co) => (
            <CoInstructorRow key={co.id} co={co} onUpdate={handleUpdate} onRemove={handleRemove} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href={`/instructor/courses/${id}/manage/communications/welcome`}>
          <Button variant="outline" size="sm">Back: Messages</Button>
        </Link>
        <Link href={`/instructor/courses/${id}/manage/review/submit`}>
          <Button variant="outline" size="sm">Next: Submit for Review</Button>
        </Link>
      </div>
    </div>
  );
}
