"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { PlayCircle, Award, BookOpen, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Enrollment[]>("/api/v1/enrollments", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEnrollments(data);
      } catch {
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  const active = enrollments.filter((e) => e.status === "active");
  const completed = enrollments.filter((e) => e.status === "completed");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[--color-text-primary]">My Learning</h1>

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({enrollments.length})</TabsTrigger>
          <TabsTrigger value="active">In Progress ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[--radius-md] border border-[--color-border] overflow-hidden">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <EnrollmentGrid enrollments={enrollments} />
            </TabsContent>
            <TabsContent value="active">
              <EnrollmentGrid enrollments={active} />
            </TabsContent>
            <TabsContent value="completed">
              <EnrollmentGrid enrollments={completed} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function EnrollmentGrid({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] bg-white py-16 text-center">
        <BookOpen className="h-12 w-12 text-[--color-border]" />
        <p className="mt-3 font-semibold text-[--color-text-secondary]">No courses here yet</p>
        <p className="mt-1 text-sm text-[--color-text-muted]">Browse the catalog to find something you love.</p>
        <Link
          href="/courses"
          className="mt-4 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[--color-primary] px-4 py-2 text-sm font-semibold text-white hover:bg-[--color-primary-hover] transition-colors"
        >
          Explore courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enrollment) => (
        <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
      ))}
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const { getToken } = useAuth();
  const isCompleted = enrollment.status === "completed";

  async function downloadCertificate() {
    const token = await getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/enrollments/${enrollment.id}/certificate`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${enrollment.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-white">
      {/* Placeholder thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[--color-primary]/10 to-[--color-primary]/5 flex items-center justify-center">
        {isCompleted ? (
          <Award className="h-12 w-12 text-[--color-star]" />
        ) : (
          <PlayCircle className="h-12 w-12 text-[--color-primary]/40" />
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <Badge variant="success">Completed</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-[--color-text-muted] mb-1">
          Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
        </p>

        {!isCompleted && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-[--color-text-muted] mb-1">
              <span>Progress</span>
            </div>
            <Progress value={0} />
          </div>
        )}

        {isCompleted && enrollment.completed_at && (
          <p className="mt-2 text-xs text-[--color-success]">
            Completed {new Date(enrollment.completed_at).toLocaleDateString()}
          </p>
        )}

        <Link
          href={`/learn/${enrollment.course_id}/${enrollment.id}`}
          className="mt-3 block w-full rounded-[--radius-sm] border border-[--color-primary] py-2 text-center text-xs font-semibold text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors"
        >
          {isCompleted ? "Review course" : "Continue learning"}
        </Link>
        {isCompleted && (
          <button
            onClick={downloadCertificate}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-[--radius-sm] border border-[--color-border] py-2 text-xs font-semibold text-[--color-text-secondary] hover:border-[--color-star] hover:text-[--color-star] transition-colors"
          >
            <Download className="h-3 w-3" /> Download Certificate
          </button>
        )}
      </div>
    </div>
  );
}
