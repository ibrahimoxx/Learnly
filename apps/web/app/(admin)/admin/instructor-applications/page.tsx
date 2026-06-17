"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  image_url: string | null;
}

interface Application {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  expertise: string;
  experience: string;
  course_ideas: string;
  motivation: string;
  website: string | null;
  linkedin: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  applicant: Applicant | null;
}

const STATUS_TABS = ["all", "pending", "approved", "rejected"] as const;
type Tab = (typeof STATUS_TABS)[number];

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",  className: "bg-amber-50 text-amber-600",  icon: Clock },
  approved:  { label: "Approved", className: "bg-green-50 text-green-600",  icon: CheckCircle2 },
  rejected:  { label: "Rejected", className: "bg-red-50 text-red-500",      icon: XCircle },
  withdrawn: { label: "Withdrawn",className: "bg-gray-100 text-gray-500",   icon: XCircle },
};

export default function InstructorApplicationsPage() {
  const { getToken } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function load(statusFilter: Tab) {
    setLoading(true);
    const token = await getToken();
    const url = statusFilter === "all"
      ? "/api/v1/admin/instructor-applications"
      : `/api/v1/admin/instructor-applications?status=${statusFilter}`;
    try {
      const data = await apiFetch<Application[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(data);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: string) {
    setActionLoading(id);
    const token = await getToken();
    try {
      const updated = await apiFetch<Application>(`/api/v1/admin/instructor-applications/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success("Application approved — user is now an instructor");
    } catch {
      toast.error("Failed to approve application");
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(id: string) {
    const reason = rejectReason[id] ?? "";
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Provide a rejection reason (min 10 characters)");
      return;
    }
    setActionLoading(id);
    const token = await getToken();
    try {
      const updated = await apiFetch<Application>(`/api/v1/admin/instructor-applications/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success("Application rejected");
    } catch {
      toast.error("Failed to reject application");
    } finally {
      setActionLoading(null);
    }
  }

  const counts = applications.reduce(
    (acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[--color-text-primary]">Instructor Applications</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Review and approve or reject instructor applications submitted by students.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-100">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-bold capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-[--color-primary] text-[--color-primary]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
            {t !== "all" && counts[t] ? (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                {counts[t]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[--color-primary]" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No {tab === "all" ? "" : tab} applications.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const badge = STATUS_BADGE[app.status] ?? STATUS_BADGE["pending"];
            const BadgeIcon = badge!.icon;
            const isExpanded = expanded === app.id;
            const name = app.applicant
              ? `${app.applicant.first_name} ${app.applicant.last_name}`
              : "Unknown";

            return (
              <div
                key={app.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                {/* Header row */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-5 py-4"
                  onClick={() => setExpanded(isExpanded ? null : app.id)}
                >
                  {app.applicant?.image_url ? (
                    <img
                      src={app.applicant.image_url}
                      alt={name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{app.applicant?.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${badge!.className}`}>
                    <BadgeIcon className="h-3 w-3" />
                    {badge!.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-50 px-5 pb-5 pt-4">
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                      <InfoBlock label="Area of expertise" value={app.expertise} />
                      <InfoBlock label="Professional experience" value={app.experience} />
                      <InfoBlock label="Course ideas" value={app.course_ideas} />
                      <InfoBlock label="Motivation" value={app.motivation} />
                      {app.website && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Website</p>
                          <a
                            href={app.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            {app.website} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {app.linkedin && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">LinkedIn</p>
                          <a
                            href={app.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-indigo-600 hover:underline"
                          >
                            {app.linkedin} <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {app.rejection_reason && (
                      <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                        <span className="font-bold">Rejection reason: </span>{app.rejection_reason}
                      </div>
                    )}

                    {app.status === "pending" && (
                      <div className="mt-5 space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-gray-600">
                            Rejection reason (required to reject)
                          </label>
                          <input
                            type="text"
                            value={rejectReason[app.id] ?? ""}
                            onChange={(e) =>
                              setRejectReason((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                            placeholder="Explain why this application is rejected..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => approve(app.id)}
                            disabled={actionLoading === app.id}
                            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-5 py-2 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => reject(app.id)}
                            disabled={actionLoading === app.id}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-gray-700">{value}</p>
    </div>
  );
}
