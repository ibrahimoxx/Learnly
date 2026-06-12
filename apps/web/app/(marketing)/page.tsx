import Link from "next/link";
import Image from "next/image";
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
      <section className="mesh-panel relative overflow-hidden px-4 py-20 text-white sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-3xl stagger-children">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white/76 shadow-[var(--shadow-sm)] backdrop-blur">
              Skillforge learning marketplace
            </span>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/74">
            {t("heroSubtitle")}
          </p>

          {/* Search */}
          <form action="/courses" className="mt-8 flex w-full max-w-2xl overflow-hidden rounded-full border border-white/20 bg-white/12 p-1 shadow-[var(--shadow-xl)] backdrop-blur-xl">
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
              className="rounded-full bg-white px-6 py-2 text-sm font-extrabold text-[--brand-800] shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5 hover:bg-white/90"
            >
              {t("heroSearchButton")}
            </button>
          </form>

          <p className="mt-4 text-xs font-semibold text-white/54">{t("heroPopular")}</p>
          </div>

          <div className="relative hidden min-h-[390px] lg:block">
            <Image
              src="/brand/hero-orbit.svg"
              alt=""
              fill
              priority
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-white/60 bg-[--color-surface-glass] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="premium-card flex items-center gap-3 rounded-[--radius-md] p-4">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
                  <Icon className="h-5 w-5 text-[--color-primary]" />
                </div>
                <div className="relative">
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
        <h2 className="text-3xl font-black tracking-tight text-[--color-text-primary]">{t("browseByCategory")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group hover-lift premium-card flex flex-col items-center gap-2 rounded-[--radius-md] p-4 text-center"
            >
              <span className="relative text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-[--color-text-secondary] group-hover:text-[--color-primary] transition-colors leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="bg-[--color-surface]/70 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black tracking-tight text-[--color-text-primary]">{t("featuredCourses")}</h2>
            <Link
              href="/courses"
              className="flex items-center gap-1 text-sm font-medium text-[--color-primary] hover:underline"
            >
              {t("viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              {featured.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="premium-card mt-10 flex flex-col items-center justify-center rounded-[--radius-lg] py-16 text-center">
              <Image src="/brand/empty-state.svg" alt="" width={180} height={130} className="mb-2" />
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]">
                <PlayCircle className="h-7 w-7 text-[--color-primary]" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[--color-text-secondary]">{t("noCoursesTitle")}</h3>
              <p className="mt-1 text-sm text-[--color-text-muted]">{t("noCoursesDesc")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Become instructor CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mesh-panel overflow-hidden rounded-[--radius-xl] p-10 text-white shadow-[var(--shadow-xl)]">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t("becomeInstructor")}</h2>
            <p className="mt-3 text-white/80">{t("becomeInstructorDesc")}</p>
            <Link href="/instructor/courses" className="mt-6 inline-block">
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
