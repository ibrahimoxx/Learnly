import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
}

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All Levels",
};

export function CourseCard({ course }: CourseCardProps) {
  const price =
    course.is_free ? "Free" : `$${(course.price_in_cents / 100).toFixed(2)}`;

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div className="overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-white transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,.12)]">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-[--color-surface]">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-3xl font-bold text-[--color-border]">
                {course.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[--color-text-primary] group-hover:text-[--color-primary] transition-colors">
            {course.title}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{levelLabels[course.level] ?? course.level}</Badge>
          </div>

          {course.rating_count > 0 && (
            <div className="mt-2">
              <StarRating rating={course.rating} count={course.rating_count} />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[--color-text-muted]">
              <Users className="h-3 w-3" />
              <span>{course.enrollment_count.toLocaleString()} students</span>
            </div>
            <span className="text-sm font-bold text-[--color-text-primary]">{price}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
