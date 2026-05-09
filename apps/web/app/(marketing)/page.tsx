import Link from "next/link";
import type { Metadata } from "next";
import { Search, ArrowRight, Award, Users, PlayCircle, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/features/courses/course-card";
import { apiFetch } from "@/lib/api";
import type { CourseListResponse } from "@/types";

export const metadata: Metadata = {
  title: "Learnly — Learn Without Limits",
};

const CATEGORIES = [
  { label: "Web Development", icon: "💻", href: "/courses?category=web-development" },
  { label: "Data Science", icon: "📊", href: "/courses?category=data-science" },
  { label: "Design", icon: "🎨", href: "/courses?category=design" },
  { label: "Business", icon: "📈", href: "/courses?category=business" },
  { label: "Marketing", icon: "📣", href: "/courses?category=marketing" },
  { label: "Photography", icon: "📷", href: "/courses?category=photography" },
  { label: "Music", icon: "🎵", href: "/courses?category=music" },
  { label: "Health & Fitness", icon: "🏋️", href: "/courses?category=health" },
];

async function getFeaturedCourses() {
  try {
    const data = await apiFetch<CourseListResponse>("/api/v1/courses?status=published&per_page=8");
    return data.items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, t] = await Promise.all([
    getFeaturedCourses(),
    getTranslations("home"),
  ]);

  const STATS = [
    { icon: Users, value: "10K+", label: t("statsStudents") },
    { icon: PlayCircle, value: "500+", label: t("statsCourses") },
    { icon: Award, value: "95%", label: t("statsCompletion") },
    { icon: TrendingUp, value: "4.8★", label: t("statsRating") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-[oklch(20%_0.05_295)] via-[oklch(28%_0.12_295)] to-[oklch(22%_0.08_295)] px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            {t("heroSubtitle")}
          </p>

          {/* Search */}
          <form action="/courses" className="mt-8 flex w-full max-w-lg mx-auto overflow-hidden rounded-full border-2 border-white/20 bg-white/10 backdrop-blur">
            <div className="flex flex-1 items-center gap-2 px-4">
              <Search className="h-4 w-4 shrink-0 text-white/60" />
              <input
                name="q"
                type="text"
                placeholder={t("heroSearchPlaceholder")}
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="m-1 rounded-full bg-[--color-primary] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[--color-primary-hover]"
            >
              {t("heroSearchButton")}
            </button>
          </form>

          <p className="mt-4 text-xs text-white/50">{t("heroPopular")}</p>
        </div>

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[--color-primary]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-400/10 blur-3xl" />
      </section>

      {/* Stats */}
      <section className="border-b border-[--color-border] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary]/10">
                  <Icon className="h-5 w-5 text-[--color-primary]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[--color-text-primary]">{value}</p>
                  <p className="text-xs text-[--color-text-muted]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold text-[--color-text-primary]">{t("browseByCategory")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex flex-col items-center gap-2 rounded-[--radius-md] border border-[--color-border] bg-white p-4 text-center transition-all hover:border-[--color-primary]/40 hover:shadow-md"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-[--color-text-secondary] group-hover:text-[--color-primary] transition-colors leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="bg-[--color-surface] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[--color-text-primary]">{t("featuredCourses")}</h2>
            <Link
              href="/courses"
              className="flex items-center gap-1 text-sm font-medium text-[--color-primary] hover:underline"
            >
              {t("viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] bg-white py-16 text-center">
              <PlayCircle className="h-12 w-12 text-[--color-border]" />
              <h3 className="mt-4 text-base font-semibold text-[--color-text-secondary]">{t("noCoursesTitle")}</h3>
              <p className="mt-1 text-sm text-[--color-text-muted]">{t("noCoursesDesc")}</p>
              <Link href="/instructor/courses" className="mt-4">
                <Button>{t("startTeaching")}</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Become instructor CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="rounded-[--radius-lg] bg-gradient-to-r from-[--color-primary] to-[oklch(42%_0.24_295)] p-10 text-white">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold sm:text-3xl">{t("becomeInstructor")}</h2>
            <p className="mt-3 text-white/80">{t("becomeInstructorDesc")}</p>
            <Link href="/instructor/courses" className="mt-6 inline-block">
              <Button className="bg-white text-[--color-primary] hover:bg-white/90 font-semibold">
                {t("startTeachingToday")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
