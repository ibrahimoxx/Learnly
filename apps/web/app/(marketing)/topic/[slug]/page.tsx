import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/features/courses/course-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getViewerEnrollmentCourseIds } from "@/lib/server/enrollments";
import type { Category, CategoryWithCount, Course, CourseListResponse } from "@/types";

interface CategoryWithPreviews extends CategoryWithCount {
  previews: Pick<Course, "id" | "image_url" | "title">[];
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  try {
    return await apiFetch<Category>(`/api/v1/categories/${slug}`);
  } catch {
    return null;
  }
}

async function getCategoryCourses(slug: string) {
  try {
    return await apiFetch<CourseListResponse>(`/api/v1/categories/${slug}/courses?limit=24`);
  } catch {
    return { items: [], total: 0, page: 1, limit: 24, total_pages: 0 };
  }
}

async function getRelatedCategories(currentSlug: string): Promise<CategoryWithPreviews[]> {
  try {
    const categories = await apiFetch<CategoryWithCount[]>(`/api/v1/categories`);
    const related = categories.filter((c) => c.slug !== currentSlug).slice(0, 6);
    const previews = await Promise.all(
      related.map((cat) =>
        apiFetch<CourseListResponse>(`/api/v1/categories/${cat.slug}/courses?limit=3`)
          .then((r) => r.items.map((c) => ({ id: c.id, image_url: c.image_url, title: c.title })))
          .catch(() => [] as Pick<Course, "id" | "image_url" | "title">[])
      )
    );
    return related.map((cat, i) => ({ ...cat, previews: previews[i] ?? [] }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Topic not found" };
  return {
    title: `${category.name} Courses — Learnly`,
    description: `Explore ${category.name} courses on Learnly, taught by expert instructors.`,
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const [category, t] = await Promise.all([getCategory(slug), getTranslations("topic")]);

  if (!category) notFound();

  const [{ items: courses, total }, relatedCategories, ownedCourseIds] = await Promise.all([
    getCategoryCourses(slug),
    getRelatedCategories(slug),
    getViewerEnrollmentCourseIds(),
  ]);
  const ownedCourseIdSet = new Set(ownedCourseIds);

  return (
    <div className="premium-shell min-h-screen">
      {/* Hero */}
      <section className="mesh-panel relative overflow-hidden text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <nav className="mb-5 flex items-center gap-2 text-xs">
            <Link
              href="/courses"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
            >
              {t("breadcrumb")}
            </Link>
            <span className="text-white/30">/</span>
            <span className="truncate text-white/60">{category.name}</span>
          </nav>

          <div className="stagger-children max-w-2xl">
            <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[--brand-300]" />
              {t("heroEyebrow")}
            </span>

            <h1 className="animate-fade-up mt-4 font-heading text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {category.name}
            </h1>

            <p className="animate-fade-up mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
              {t("heroDescription", { name: category.name })}
            </p>

            <p className="animate-fade-up mt-4 text-sm font-semibold text-white/70">
              {t("coursesCount", { count: total })}
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {courses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} isOwned={ownedCourseIdSet.has(course.id)} />
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Link href="/courses">
                <Button variant="outline" size="lg">
                  {t("browseAll")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="premium-card flex flex-col items-center justify-center rounded-[--radius-lg] py-20 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-[--color-text-muted]" />
            <p className="relative text-base font-extrabold text-[--color-text-secondary]">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">{t("emptyDescription")}</p>
            <Link href="/courses" className="mt-6">
              <Button>{t("browseAll")}</Button>
            </Link>
          </div>
        )}

        {/* Related topics */}
        {relatedCategories.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">{t("relatedTopics")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/topic/${cat.slug}`}
                  className="hover-lift inline-flex items-center gap-2 rounded-full border border-[--color-border] bg-[--color-surface-raised] px-4 py-2 text-sm font-bold text-[--color-text-secondary] shadow-[var(--shadow-xs)] transition-colors hover:border-[--color-primary] hover:text-[--color-primary]"
                >
                  {cat.name}
                  <span className="text-xs text-[--color-text-muted]">({cat.course_count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
