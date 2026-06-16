"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { BarChart2, Users, Clock, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface MemberActivity {
  student_id: string;
  student_name: string;
  student_email: string;
  enrolled_courses: number;
  completed_courses: number;
  total_lessons_completed: number;
  watched_seconds: number;
  last_active: string | null;
}

interface OrgActivityStats {
  total_active_members: number;
  total_minutes_watched: number;
  total_completions: number;
  members: MemberActivity[];
}

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export default function OrgActivityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();
  const [data, setData] = useState<OrgActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const res = await apiFetch<OrgActivityStats>(`/api/v1/orgs/${slug}/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken, slug]);

  const stats = [
    {
      icon: Users,
      label: "Active Members",
      value: data?.total_active_members ?? "—",
    },
    {
      icon: Clock,
      label: "Minutes Watched",
      value: data ? data.total_minutes_watched.toLocaleString() : "—",
    },
    {
      icon: Award,
      label: "Course Completions",
      value: data?.total_completions ?? "—",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-3xl font-black tracking-tight text-[--color-text-primary]">
        Member Activity
      </h1>
      <p className="mb-6 text-sm text-[--color-text-muted]">
        Learning engagement across all org courses.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="premium-card flex items-center gap-4 rounded-[--radius-md] p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
              <Icon className="h-5 w-5 text-[--color-primary]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[--color-text-primary]">
                {loading ? "—" : value}
              </p>
              <p className="text-xs text-[--color-text-muted]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card rounded-[--radius-lg] overflow-hidden">
        <div className="border-b border-[--color-border] px-5 py-3.5">
          <h2 className="font-semibold text-[--color-text-primary]">Members</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 rounded-[--radius-md]" />
            ))}
          </div>
        ) : !data || data.members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart2 className="mb-3 h-10 w-10 text-[--color-text-muted]" />
            <p className="text-sm font-medium text-[--color-text-secondary]">No activity yet</p>
            <p className="mt-1 text-xs text-[--color-text-muted]">
              Activity will appear once members enroll in org courses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border] bg-[--color-surface]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Member
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Enrolled
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Lessons Done
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Watch Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m, i) => (
                  <tr
                    key={m.student_id}
                    className={`border-b border-[--color-border]/60 transition-colors hover:bg-[--color-surface] ${
                      i % 2 === 0 ? "" : "bg-[--color-surface]/40"
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[--color-text-primary]">{m.student_name}</p>
                      <p className="text-xs text-[--color-text-muted]">{m.student_email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-[--color-text-primary]">
                      {m.enrolled_courses}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`font-medium ${
                          m.completed_courses > 0
                            ? "text-[--color-primary]"
                            : "text-[--color-text-muted]"
                        }`}
                      >
                        {m.completed_courses}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-[--color-text-primary]">
                      {m.total_lessons_completed}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-[--color-text-primary]">
                      {fmt(m.watched_seconds)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-[--color-text-muted]">
                      {relativeTime(m.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
