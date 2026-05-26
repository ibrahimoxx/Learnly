import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Clock, Users, Award, Globe, CheckCircle, PlayCircle, FileText, BarChart,
} from "lucide-react";
import { StarRating } from "@/components/features/courses/star-rating";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PreviewCurriculum } from "@/components/features/courses/preview-curriculum";
import { EnrollButton } from "./enroll-button";
import { ReviewSection } from "@/components/features/courses/review-section";
import { WishlistButton } from "@/components/features/courses/wishlist-button";
import AffiliateTracker from "@/components/shared/affiliate-tracker";
import DiscussionSection from "@/components/features/courses/discussion-section";
import { RecommendationsSection } from "@/components/features/courses/recommendations-section";
import { apiFetch } from "@/lib/api";
import type { Course, Section, Lesson, Review } from "@/types";
import { Suspense } from "react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string>>;
}

async function getCourse(slug: string) {
  try {
    return await apiFetch<Course>(`/api/v1/courses/slug/${slug}`);
  } catch {
    return null;
  }
}

async function getSections(courseId: string) {
  try {
    return await apiFetch<Section[]>(`/api/v1/courses/${courseId}/sections`);
  } catch {
    return [];
  }
}

async function getLessons(sectionId: string) {
  try {
    return await apiFetch<Lesson[]>(`/api/v1/sections/${sectionId}/lessons`);
  } catch {
    return [];
  }
}

async function getReviews(courseId: string) {
  try {
    return await apiFetch<Review[]>(`/api/v1/courses/${courseId}/reviews`);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Course not found" };
  return { title: course.title, description: course.description };
}

const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All Levels",
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const [course, t] = await Promise.all([
    getCourse(slug),
    getTranslations("course"),
  ]);

  if (!course || course.status !== "published") notFound();

  const [sections, initialReviews] = await Promise.all([
    getSections(course.id),
    getReviews(course.id),
  ]);
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      lessons: await getLessons(section.id),
    }))
  );

  const totalLessons = sectionsWithLessons.reduce((acc, s) => acc + s.lessons.length, 0);
  const price = course.is_free ? t("free") : `$${(course.price_in_cents / 100).toFixed(2)}`;

  const learnItems = [
    t("learnItem1"),
    t("learnItem2"),
    t("learnItem3"),
    t("learnItem4"),
  ];

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <AffiliateTracker />
      </Suspense>
      {/* Course hero — dark bg */}
      <div className="bg-[oklch(14%_0.03_295)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="max-w-2xl">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 text-xs text-white/50">
              <Link href="/courses" className="hover:text-white/80">{t("courses")}</Link>
              <span>/</span>
              <span className="text-white/70">{course.title}</span>
            </nav>

            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{course.title}</h1>

            {course.description && (
              <p className="mt-3 text-white/70 text-sm leading-relaxed line-clamp-3">
                {course.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge variant="default" className="bg-[--color-star] text-white">
                {levelLabels[course.level] ?? course.level}
              </Badge>
              {course.review_count > 0 && (
                <StarRating rating={course.rating} count={course.review_count} />
              )}
              <span className="flex items-center gap-1 text-xs text-white/60">
                <Users className="h-3 w-3" />
                {t("students", { count: course.enrollment_count.toLocaleString() })}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {course.language}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(course.total_duration_seconds)} total
              </span>
              <span className="flex items-center gap-1">
                <PlayCircle className="h-3 w-3" />
                {totalLessons} {t("lessons").toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* What you'll learn */}
            <section>
              <h2 className="text-lg font-bold text-[--color-text-primary]">{t("whatYoullLearn")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-2 rounded-[--radius-md] border border-[--color-border] p-5 sm:grid-cols-2">
                {learnItems.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
                    <span className="text-sm text-[--color-text-secondary]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Course includes */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-[--color-text-primary]">{t("includes")}</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { icon: PlayCircle, text: `${formatDuration(course.total_duration_seconds)} ${t("onDemandVideo")}` },
                  { icon: FileText, text: `${sections.length} sections, ${totalLessons} lessons` },
                  { icon: BarChart, text: levelLabels[course.level] ?? course.level },
                  { icon: Award, text: t("certificateCompletion") },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-[--color-text-secondary]">
                    <Icon className="h-4 w-4 text-[--color-text-muted]" />
                    {text}
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-8" />

            {/* Curriculum */}
            <section>
              <h2 className="text-lg font-bold text-[--color-text-primary]">{t("curriculum")}</h2>
              <p className="mt-1 text-sm text-[--color-text-muted]">
                {t("curriculumMeta", {
                  sections: sections.length,
                  lessons: totalLessons,
                  duration: formatDuration(course.total_duration_seconds),
                })}
              </p>

              {sectionsWithLessons.length > 0 ? (
                <PreviewCurriculum
                  sectionsWithLessons={sectionsWithLessons}
                  lessonsLabel={t("lessons")}
                  previewLabel={t("preview")}
                />
              ) : (
                <p className="mt-4 text-sm text-[--color-text-muted]">{t("noLessons")}</p>
              )}
            </section>

            <Separator className="my-8" />

            <ReviewSection courseId={course.id} initialReviews={initialReviews} />

            <Separator className="my-8" />

            <RecommendationsSection currentCourseId={course.id} />

            <Separator className="my-8" />

            <section>
              <h2 className="text-lg font-bold text-[--color-text-primary]">Discussion</h2>
              <p className="mt-1 text-sm text-[--color-text-muted]">
                Ask questions, share insights, or start a conversation with other students.
              </p>
              <div className="mt-6">
                <Suspense fallback={<div className="h-24 rounded-[--radius-md] bg-[--color-surface] animate-pulse" />}>
                  <DiscussionSection courseId={course.id} theme="light" />
                </Suspense>
              </div>
            </section>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="sticky top-24 rounded-[--radius-md] border border-[--color-border] bg-white shadow-[0_4px_20px_rgba(0,0,0,.1)] overflow-hidden">
              {/* Preview thumbnail */}
              <div className="relative aspect-video bg-[--color-surface]">
                {course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PlayCircle className="h-12 w-12 text-[--color-border]" />
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[--color-text-primary]">{price}</span>
                </div>

                <EnrollButton courseId={course.id} isFree={course.is_free} priceInCents={course.price_in_cents} />
                <div className="mt-2">
                  <WishlistButton courseId={course.id} />
                </div>

                <p className="mt-3 text-center text-xs text-[--color-text-muted]">
                  {t("moneyBack")}
                </p>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  {[
                    { label: t("level"), value: levelLabels[course.level] ?? course.level },
                    { label: t("language"), value: course.language },
                    { label: t("duration"), value: formatDuration(course.total_duration_seconds) },
                    { label: t("lessons"), value: totalLessons.toString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[--color-text-muted]">{label}</span>
                      <span className="font-medium text-[--color-text-secondary]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
