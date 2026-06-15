"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Award, Download, Linkedin, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

export default function CompletedCoursesPage() {
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
        setEnrollments(data.filter((e) => e.status === "completed"));
      } catch {
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  async function downloadCertificate(enrollmentId: string) {
    const token = await getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/enrollments/${enrollmentId}/certificate`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${enrollmentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Student studio
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary] sm:text-5xl">
          Completed &amp; Certificates
        </h1>
        <p className="mt-2 text-sm text-[--color-text-secondary]">
          Courses you&apos;ve finished — download your certificates or share them on LinkedIn.
        </p>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="premium-card rounded-[--radius-md] p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="premium-card mt-8 flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
            <img src="/brand/empty-state.svg" alt="" className="mb-4 h-32 w-auto" />
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]">
              <Award className="h-7 w-7 text-[--color-primary]" />
            </span>
            <p className="mt-3 font-semibold text-[--color-text-secondary]">No completed courses yet</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Finish a course to earn your first certificate.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-2 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 transition-all"
            >
              Go to My Learning
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 stagger-children">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="hover-lift premium-card rounded-[--radius-lg] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary-subtle]">
                    <Award className="h-5 w-5 text-[--color-star]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[--color-text-primary] line-clamp-2">
                      {enrollment.course_title ?? "Course"}
                    </p>
                    {enrollment.completed_at && (
                      <p className="mt-1 text-xs text-[--color-success]">
                        Completed {new Date(enrollment.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => downloadCertificate(enrollment.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[--radius-sm] bg-[image:var(--gradient-brand)] py-2 text-xs font-extrabold text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Certificate
                  </button>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(enrollment.course_title ?? "Course")}&certUrl=${encodeURIComponent(
                        typeof window !== "undefined" ? window.location.origin : ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[--radius-sm] border border-[--color-border] py-2 text-xs font-semibold text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> Add to LinkedIn
                    </a>
                    <Link
                      href={`/courses/${enrollment.course_slug}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[--radius-sm] border border-[--color-primary] py-2 text-xs font-semibold text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> View course
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
