"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Users, BookOpen, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

interface Stats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  published_courses: number;
  pending_review_courses: number;
}

export default function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Stats>("/api/v1/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const cards = stats
    ? [
        { label: "Total users", value: stats.total_users, icon: Users, color: "text-blue-500" },
        { label: "Total courses", value: stats.total_courses, icon: BookOpen, color: "text-purple-500" },
        { label: "Total enrollments", value: stats.total_enrollments, icon: TrendingUp, color: "text-green-500" },
        { label: "Pending review", value: stats.pending_review_courses, icon: Clock, color: "text-yellow-500" },
      ]
    : [];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-[--color-text-primary] mb-6">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[--radius-md]" />)
          : cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-raised] p-5 shadow-[var(--shadow-xs)] hover-lift">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[--color-text-muted]">{label}</p>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="mt-2 text-3xl font-bold text-[--color-text-primary]">{value.toLocaleString()}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
