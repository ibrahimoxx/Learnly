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
        { label: "Total users", value: stats.total_users, icon: Users, color: "text-[--color-accent-sky]" },
        { label: "Total courses", value: stats.total_courses, icon: BookOpen, color: "text-[--color-primary]" },
        { label: "Total enrollments", value: stats.total_enrollments, icon: TrendingUp, color: "text-[--color-success]" },
        { label: "Pending review", value: stats.pending_review_courses, icon: Clock, color: "text-[--color-warning]" },
      ]
    : [];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-4xl font-black tracking-tight text-[--color-text-primary]">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[--radius-md]" />)
          : cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="hover-lift premium-card rounded-[--radius-md] p-5">
                <div className="relative flex items-center justify-between">
                  <p className="text-xs font-medium text-[--color-text-muted]">{label}</p>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="relative mt-2 text-3xl font-black text-[--color-text-primary]">{value.toLocaleString()}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
