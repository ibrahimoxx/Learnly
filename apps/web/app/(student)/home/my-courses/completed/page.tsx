"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Award, BookOpen, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Enrollment } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TABS = [
  { label: "In Progress", href: "/dashboard?tab=active" },
  { label: "Completed",   href: "/dashboard?tab=completed" },
  { label: "Certificates", href: "/home/my-courses/completed" },
] as const;

export default function CertificatesPage() {
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

  async function viewCertificate(enrollmentId: string) {
    const token = await getToken();
    const res = await fetch(`${API}/api/v1/enrollments/${enrollmentId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function downloadCertificate(enrollmentId: string, courseTitle: string) {
    const token = await getToken();
    const res = await fetch(`${API}/api/v1/enrollments/${enrollmentId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseTitle.replace(/[^a-z0-9]+/gi, "-")}-certificate.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Tab bar */}
        <div className="flex border-b border-gray-200">
          {TABS.map(({ label, href }) => {
            const active = label === "Certificates";
            return (
              <Link
                key={label}
                href={href}
                className="relative mr-6 pb-3 text-sm font-medium transition-colors"
                style={{ color: active ? "#1c1d1f" : "#6a6f73" }}
              >
                {label}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "#1c1d1f" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Heading */}
        <h2 className="mt-8 text-xl font-bold" style={{ color: "#1c1d1f" }}>
          Course
        </h2>

        {/* States */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="h-52 animate-pulse bg-gray-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "#f7f9fa" }}
            >
              <Award className="h-10 w-10" style={{ color: "#9ca3af" }} />
            </div>
            <p className="text-base font-bold" style={{ color: "#1c1d1f" }}>
              No certificates yet
            </p>
            <p className="text-sm" style={{ color: "#6a6f73" }}>
              Complete a course to earn your first certificate.
            </p>
            <Link
              href="/courses"
              className="mt-2 rounded px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#1c1d1f" }}
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <CertCard
                key={enrollment.id}
                enrollment={enrollment}
                onView={() => viewCertificate(enrollment.id)}
                onDownload={() => downloadCertificate(enrollment.id, enrollment.course_title ?? "course")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Certificate preview card ── */

function CertCard({
  enrollment,
  onView,
  onDownload,
}: {
  enrollment: Enrollment;
  onView: () => void;
  onDownload: () => void;
}) {
  const completedDate = enrollment.completed_at
    ? new Date(enrollment.completed_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    enrollment.course_title ?? "Course"
  )}&certUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`;

  return (
    <div
      className="overflow-hidden rounded-lg transition-shadow hover:shadow-md"
      style={{ border: "1px solid #d1d7dc" }}
    >
      {/* Certificate preview */}
      <div
        className="relative flex h-52 items-center justify-between overflow-hidden"
        style={{ background: "#ffffff", border: "none" }}
      >
        {/* Left: cert content mock */}
        <div className="flex-1 px-5 py-4 text-left">
          {/* Org placeholder logo area */}
          <div
            className="mb-3 flex h-6 items-center"
            style={{ color: "#6a6f73" }}
          >
            <BookOpen className="h-5 w-5" style={{ color: "#0056d2" }} />
            <span className="ml-1.5 text-[11px] font-black tracking-tight" style={{ color: "#0056d2" }}>
              Learnly
            </span>
          </div>

          <p className="text-[9px] uppercase tracking-widest" style={{ color: "#9ca3af" }}>
            Course Certificate
          </p>
          <p className="mt-2 text-[11px] font-semibold leading-tight" style={{ color: "#3d4244" }}>
            {completedDate ?? ""}
          </p>
          <p className="mt-1 text-sm font-black leading-snug" style={{ color: "#1c1d1f" }}>
            {enrollment.course_title ?? "Course"}
          </p>

          {/* Fake signature line */}
          <div className="mt-4 flex items-end gap-2">
            <span
              className="font-['Brush_Script_MT',cursive] text-lg leading-none"
              style={{ color: "#1c1d1f" }}
            >
              Learnly
            </span>
          </div>
        </div>

        {/* Right: decorative banner + seal */}
        <div
          className="relative flex h-full w-20 shrink-0 flex-col items-center justify-center gap-3"
          style={{
            background: "linear-gradient(180deg,#d1d9e8 0%,#b8c4dd 100%)",
            clipPath: "polygon(0 0,100% 0,100% 85%,50% 100%,0 85%)",
          }}
        >
          <p
            className="text-center text-[8px] font-black uppercase tracking-widest leading-tight"
            style={{ color: "#4a5568" }}
          >
            COURSE<br />CERTIFICATE
          </p>
          {/* Seal */}
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              border: "2px solid #4a5568",
              background: "rgba(255,255,255,0.25)",
              boxShadow: "0 0 0 3px rgba(74,85,104,0.2)",
            }}
          >
            <Award className="h-5 w-5" style={{ color: "#2d3748" }} />
          </div>
        </div>

        {/* Outer border effect */}
        <div
          className="pointer-events-none absolute inset-2 rounded"
          style={{ border: "1px solid #d1d7dc" }}
        />
      </div>

      {/* Card info */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid #d1d7dc" }}>
        <p className="text-sm font-bold leading-snug" style={{ color: "#1c1d1f" }}>
          {enrollment.course_title ?? "Course"}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold transition-opacity hover:opacity-75"
            style={{ color: "#0056d2" }}
          >
            Add to LinkedIn
          </a>
          <button
            onClick={onView}
            className="text-xs font-semibold transition-opacity hover:opacity-75"
            style={{ color: "#0056d2" }}
          >
            View certificate
          </button>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-75"
            style={{ color: "#0056d2" }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>

        <p className="mt-1.5 text-[11px]" style={{ color: "#6a6f73" }}>
          Learnly
        </p>
        {completedDate && (
          <p className="text-[11px]" style={{ color: "#6a6f73" }}>
            Completed{" "}
            <span style={{ color: "#c37d16" }}>{completedDate}</span>
          </p>
        )}
      </div>
    </div>
  );
}
