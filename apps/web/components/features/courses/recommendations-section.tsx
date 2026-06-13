"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Course, Enrollment } from "@/types";

export function RecommendationsSection({ currentCourseId = "" }: { currentCourseId?: string }) {
  const { getToken, isSignedIn } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;

    async function load() {
      const token = await getToken();
      try {
        const [data, enrollments] = await Promise.all([
          apiFetch<Course[]>("/api/v1/recommendations?limit=4", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch<Enrollment[]>("/api/v1/enrollments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setCourses(data.filter((course) => course.id !== currentCourseId));
        setOwnedCourseIds(Array.from(new Set(enrollments.map((enrollment) => enrollment.course_id))));
      } catch {
        // Recommendations are non-critical.
      }
    }

    void load();
  }, [currentCourseId, getToken, isSignedIn]);

  if (courses.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-black tracking-tight text-[--color-text-primary]">You might also like</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="hover-lift premium-card flex gap-3 rounded-[--radius-md] p-3 transition-colors hover:border-[--color-primary]"
          >
            <div className="relative min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-[--color-text-primary]">{course.title}</p>
              <p className="mt-1 text-xs text-[--color-text-muted]">
                {ownedCourseIds.includes(course.id)
                  ? "Owned"
                  : course.is_free
                    ? "Free"
                    : `$${(course.price_in_cents / 100).toFixed(2)}`}
                {course.rating ? ` · ${Number(course.rating).toFixed(1)}★` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
