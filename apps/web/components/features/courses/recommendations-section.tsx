"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

export function RecommendationsSection({ currentCourseId = "" }: { currentCourseId?: string }) {
  const { getToken, isSignedIn } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;
    async function load() {
      const token = await getToken();
      try {
        const data = await apiFetch<Course[]>("/api/v1/recommendations?limit=4", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(data.filter((c) => c.id !== currentCourseId));
      } catch {
        // silent — recommendations are non-critical
      }
    }
    load();
  }, [isSignedIn, getToken, currentCourseId]);

  if (courses.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-bold text-[--color-text-primary]">You might also like</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}`}
            className="flex gap-3 rounded-[--radius-md] border border-[--color-border] bg-white p-3 hover:border-[--color-primary] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[--color-text-primary] line-clamp-2">{course.title}</p>
              <p className="mt-1 text-xs text-[--color-text-muted]">
                {course.is_free ? "Free" : `$${(course.price_in_cents / 100).toFixed(2)}`}
                {course.rating ? ` · ${Number(course.rating).toFixed(1)}★` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
