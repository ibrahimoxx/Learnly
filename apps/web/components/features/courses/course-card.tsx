import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { AddToCartButton } from "./add-to-cart-button";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
}

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All Levels",
};

export function CourseCard({ course }: CourseCardProps) {
  const price =
    course.is_free ? "Free" : `$${(course.price_in_cents / 100).toFixed(2)}`;

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div className="hover-lift premium-card rounded-[--radius-lg]">
        {/* Thumbnail */}
        <div className="thumbnail-fallback sheen-overlay relative aspect-video w-full overflow-hidden">
          {course.image_url ? (
            <Image
              src={course.image_url}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="rounded-[--radius-lg] border border-white/18 bg-white/10 px-5 py-3 font-heading text-5xl font-black tracking-tight text-white shadow-[var(--shadow-lg)] backdrop-blur">
                {course.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-x-3 bottom-3 h-px bg-white/35" />
        </div>

        {/* Content */}
        <div className="relative p-4">
          <h2 className="line-clamp-2 font-heading text-base font-black leading-tight text-[--color-text-primary] transition-colors group-hover:text-[--color-primary]">
            {course.title}
          </h2>

          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{levelLabels[course.level] ?? course.level}</Badge>
          </div>

          {course.review_count > 0 && (
            <div className="mt-2">
              <StarRating rating={Number(course.rating)} count={course.review_count} />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[--color-text-muted]">
              <Users className="h-3 w-3" />
              <span>{(course.enrollment_count ?? 0).toLocaleString()} students</span>
            </div>
            <span className="rounded-full bg-[--color-primary-subtle] px-2.5 py-1 text-sm font-extrabold text-[--brand-800]">{price}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
