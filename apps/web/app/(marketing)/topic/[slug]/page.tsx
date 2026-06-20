import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/features/courses/course-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { normalizeYtThumbnail } from "@/lib/utils";
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
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/topic/${cat.slug}`}
                  className="group hover-lift premium-card flex flex-col overflow-hidden rounded-[--radius-lg] transition-all hover:border-[--color-primary]/40"
                >
                  {/* Thumbnail strip */}
                  <div className="relative flex h-24 overflow-hidden bg-[--color-surface]">
                    {cat.previews.length > 0 ? (
                      cat.previews.map((course, idx) => (
                        <div
                          key={course.id}
                          className="relative flex-1 overflow-hidden"
                          style={{ flex: idx === 0 ? 2 : 1 }}
                        >
                          {course.image_url ? (
                            <Image
                              src={normalizeYtThumbnail(course.image_url)}
                              alt={course.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-linear-to-br from-[--brand-700] to-[--color-primary]">
                              <span className="text-xs font-black text-white/80">
                                {course.title.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {idx > 0 && <div className="absolute inset-y-0 left-0 w-px bg-white/20" />}
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[--brand-700] via-[--brand-600] to-[--color-primary]">
                        <span className="text-2xl font-black text-white/40">{cat.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    {/* Dark overlay + category name on image */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                  </div>

                  {/* Label */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-bold text-[--color-text-primary] transition-colors group-hover:text-[--color-primary]">
                      {cat.name}
                    </span>
                    <span className="rounded-full bg-[--color-primary-subtle] px-2 py-0.5 text-[10px] font-extrabold text-[--brand-800]">
                      {cat.course_count} {cat.course_count === 1 ? "course" : "courses"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
