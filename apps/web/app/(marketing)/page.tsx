import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  BarChart3,
  BriefcaseBusiness,
  Camera,
  Code2,
  Dumbbell,
  Megaphone,
  Music2,
  Palette,
  PlayCircle,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnimatedStat } from "@/components/features/home/animated-stat";
import { HeroSection } from "@/components/features/home/hero-section";
import { Reveal } from "@/components/features/home/reveal";
import { CourseViewToggle } from "@/components/features/courses/course-view-toggle";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getViewerEnrollmentCourseIds } from "@/lib/server/enrollments";
import type { Course, CourseListResponse } from "@/types";

export const metadata: Metadata = {
  title: "Learnly - Learn Without Limits",
};

const CATEGORIES = [
  { label: "Web Development", icon: Code2, href: "/courses?category=web-development" },
  { label: "Data Science", icon: BarChart3, href: "/courses?category=data-science" },
  { label: "Design", icon: Palette, href: "/courses?category=design" },
  { label: "Business", icon: BriefcaseBusiness, href: "/courses?category=business" },
  { label: "Marketing", icon: Megaphone, href: "/courses?category=marketing" },
  { label: "Photography", icon: Camera, href: "/courses?category=photography" },
  { label: "Music", icon: Music2, href: "/courses?category=music" },
  { label: "Health & Fitness", icon: Dumbbell, href: "/courses?category=health" },
];

interface PlatformStats {
  avg_rating: number;
  total_courses: number;
  total_reviews: number;
  total_students: number;
}

async function getAllCourses(): Promise<Course[]> {
  try {
    const data = await apiFetch<CourseListResponse>("/api/v1/courses?status=published&per_page=50");
    return data.items;
  } catch {
    return [];
  }
}

async function getPlatformStats(): Promise<PlatformStats> {
  try {
    return await apiFetch<PlatformStats>("/api/v1/stats");
  } catch {
    return { total_courses: 0, total_students: 0, avg_rating: 0, total_reviews: 0 };
  }
}

export default async function HomePage() {
  const [allCourses, ownedCourseIds, t, platformStats] = await Promise.all([
    getAllCourses(),
    getViewerEnrollmentCourseIds(),
    getTranslations("home"),
    getPlatformStats(),
  ]);
  const ownedCourseIdSet = new Set(ownedCourseIds);
  const stats = [
    { iconName: "students" as const, value: platformStats.total_students, suffix: "+", label: t("statsStudents") },
    { iconName: "courses" as const, value: platformStats.total_courses, suffix: "+", label: t("statsCourses") },
    {
      iconName: "rating" as const,
      value: platformStats.avg_rating > 0 ? platformStats.avg_rating : null,
      suffix: "\u2605",
      decimals: 1,
      fallback: "\u2014",
      label: t("statsRating"),
    },
    { iconName: "reviews" as const, value: platformStats.total_reviews, suffix: "+", label: t("statsReviews") },
  ];

  return (
    <>
      <HeroSection
        badgeText="Learnly learning marketplace"
        popularLabel={t("heroPopular")}
        popularTags={CATEGORIES.slice(0, 4).map(({ href, label }) => ({ href, label }))}
        searchButton={t("heroSearchButton")}
        searchPlaceholder={t("heroSearchPlaceholder")}
        subtitle={t("heroSubtitle")}
        title={t("heroTitle")}
      />

      <section
        id="learnly-stats"
        className="border-b border-white/60 bg-[--color-surface-glass] backdrop-blur-xl"
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, index) => (
              <AnimatedStat
                key={stat.label}
                decimals={stat.decimals}
                delay={index * 0.1}
                fallback={stat.fallback}
                iconName={stat.iconName}
                label={stat.label}
                suffix={stat.suffix}
                value={stat.value}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-black tracking-tight text-[--color-text-primary]">
          {t("browseByCategory")}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat, index) => {
            const Icon = cat.icon;
            return (
              <Reveal key={cat.href} delay={index * 0.1} variant="scale">
                <Link
                  href={cat.href}
                  className="group hover-lift premium-card flex flex-col items-center gap-2 rounded-[--radius-md] p-4 text-center"
                >
                  <Icon className="h-6 w-6 text-[--color-primary]" />
                  <span className="text-xs font-medium leading-tight text-[--color-text-secondary] transition-colors group-hover:text-[--color-primary]">
                    {cat.label}
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="bg-[--color-surface]/70 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {allCourses.length > 0 ? (
            <CourseViewToggle courses={allCourses} ownedIds={ownedCourseIdSet} />
          ) : (
            <div className="premium-card flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
              <Image src="/brand/empty-state.svg" alt="" width={180} height={130} className="mb-2" />
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]">
                <PlayCircle className="h-7 w-7 text-[--color-primary]" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[--color-text-secondary]">
                {t("noCoursesTitle")}
              </h3>
              <p className="mt-1 text-sm text-[--color-text-muted]">{t("noCoursesDesc")}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mesh-panel overflow-hidden rounded-[--radius-xl] p-10 text-white shadow-[var(--shadow-xl)]">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t("becomeInstructor")}</h2>
            <p className="mt-3 text-white/80">{t("becomeInstructorDesc")}</p>
            <Link href="/teach" className="mt-6 inline-block">
              <Button className="bg-white text-[--brand-800] hover:bg-white/90">
                {t("startTeachingToday")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
