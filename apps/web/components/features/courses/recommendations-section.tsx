"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/types";

export function RecommendationsSection() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<Course[]>("/api/v1/recommendations?limit=6", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(data);
      } catch {
        // silent — section simply stays hidden
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  if (!loading && courses.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[--color-text-primary] mb-4">
        Recommended for you
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[--radius-md] border border-[--color-border]">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}
