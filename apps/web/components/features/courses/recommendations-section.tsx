"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { Star, Users, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { normalizeYtThumbnail } from "@/lib/utils";
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
        setOwnedCourseIds(Array.from(new Set(enrollments.map((e) => e.course_id))));
      } catch {
        // non-critical
      }
    }

    void load();
  }, [currentCourseId, getToken, isSignedIn]);

  if (courses.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[--color-primary-subtle]">
          <Sparkles className="h-3.5 w-3.5 text-[--color-primary]" />
        </span>
        <h2 className="text-xl font-black tracking-tight text-[--color-text-primary]">You might also like</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const isOwned = ownedCourseIds.includes(course.id);
          const price = isOwned
            ? "Owned"
            : course.is_free
              ? "Free"
              : `$${(course.price_in_cents / 100).toFixed(2)}`;

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group hover-lift premium-card flex gap-3 overflow-hidden rounded-[--radius-lg] p-0 transition-all hover:border-[--color-primary]/40"
            >
              {/* Thumbnail */}
              <div className="relative h-auto w-28 shrink-0 overflow-hidden bg-linear-to-br from-[--brand-700] via-[--brand-600] to-[--color-primary] sm:w-32">
                {course.image_url ? (
                  <Image
                    src={normalizeYtThumbnail(course.image_url)}
                    alt={course.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2">
                    <span className="text-center text-xl font-black text-white/90">
                      {course.title.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-linear-to-r from-transparent to-black/10" />
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-3">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-[--color-text-primary] transition-colors group-hover:text-[--color-primary]">
                  {course.title}
                </p>

                <div className="mt-2 flex items-center gap-2.5 text-[11px]">
                  {course.rating ? (
                    <span className="flex items-center gap-0.5 font-bold text-[--color-star]">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {Number(course.rating).toFixed(1)}
                    </span>
                  ) : null}

                  {course.enrollment_count ? (
                    <span className="flex items-center gap-0.5 text-[--color-text-muted]">
                      <Users className="h-2.5 w-2.5" />
                      {(course.enrollment_count ?? 0).toLocaleString()}
                    </span>
                  ) : null}

                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isOwned
                        ? "bg-[--color-success]/12 text-[--color-success]"
                        : course.is_free
                          ? "bg-[--color-primary-subtle] text-[--brand-800]"
                          : "bg-[--color-primary-subtle] text-[--brand-800]"
                    }`}
                  >
                    {price}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
