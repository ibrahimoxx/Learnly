"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "./wishlist-button";
import type { Course } from "@/types";

interface CourseCardProps {
  course: Course;
  isOwned?: boolean;
}

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All Levels",
};

export function CourseCard({ course, isOwned = false }: CourseCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const price = isOwned ? "Owned" : course.is_free ? "Free" : `$${(course.price_in_cents / 100).toFixed(2)}`;

  return (
    <div
      className="group relative rounded-[--radius-lg] transition-all duration-500"
      style={
        wishlisted
          ? {
              boxShadow:
                "0 0 0 1.5px rgba(244,63,94,0.4), 0 4px 24px rgba(244,63,94,0.18), 0 16px 48px rgba(244,63,94,0.10)",
              transform: "translateY(-2px)",
            }
          : {
              boxShadow: "var(--shadow-card, 0 2px 8px rgba(0,0,0,0.08))",
              transform: "translateY(0px)",
            }
      }
    >
      {/* Gradient glow layer behind card when wishlisted */}
      {wishlisted && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[--radius-lg] opacity-100 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.08) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />
      )}

      <div className="relative z-10 overflow-hidden rounded-[--radius-lg] bg-white" style={wishlisted ? { outline: "1px solid rgba(244,63,94,0.25)" } : {}}>
        <Link href={`/courses/${course.slug}`} className="block">
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
                <span className="rounded-[--radius-lg] border border-white/18 bg-white/10 px-5 py-3 font-heading text-5xl font-black tracking-tight text-white shadow-(--shadow-lg) backdrop-blur">
                  {course.title.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-x-3 bottom-3 h-px bg-white/35" />

            {/* Saved badge on thumbnail */}
            <div
              className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-all duration-300"
              style={
                wishlisted
                  ? {
                      background: "rgba(244,63,94,0.92)",
                      color: "white",
                      backdropFilter: "blur(8px)",
                      opacity: 1,
                      transform: "scale(1)",
                    }
                  : {
                      opacity: 0,
                      transform: "scale(0.7)",
                      pointerEvents: "none",
                      background: "rgba(244,63,94,0.92)",
                      color: "white",
                    }
              }
            >
              <Heart className="h-2.5 w-2.5" style={{ fill: "white", stroke: "white" }} />
              Saved
            </div>
          </div>

          {/* Content */}
          <div className="relative px-4 pb-2 pt-4">
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
          </div>
        </Link>

        <div className="mt-2 flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-1 text-xs text-[--color-text-muted]">
            <Users className="h-3 w-3" />
            <span>{(course.enrollment_count ?? 0).toLocaleString()} students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-sm font-extrabold ${
                isOwned
                  ? "bg-[--color-success]/12 text-[--color-success]"
                  : "bg-[--color-primary-subtle] text-[--brand-800]"
              }`}
            >
              {price}
            </span>
            <WishlistButton courseId={course.id} iconOnly onToggle={setWishlisted} />
            <AddToCartButton
              courseId={course.id}
              slug={course.slug}
              title={course.title}
              imageUrl={course.image_url}
              priceInCents={course.price_in_cents}
              isFree={course.is_free}
              isOwned={isOwned}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
