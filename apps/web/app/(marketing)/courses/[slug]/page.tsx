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
import type { Course, Section, Lesson } from "@/types";
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
  expert: "Expert",
  all: "All Levels",
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Async server component — fetches sections+lessons independently so hero renders first
async function CourseCurriculumSection({ courseId, totalDuration }: {
  courseId: string;
  totalDuration: number;
}) {
  const t = await getTranslations("course");
  const sections = await getSections(courseId);
  const sectionsWithLessons = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      lessons: await getLessons(section.id),
    }))
  );
  const totalLessons = sectionsWithLessons.reduce((acc, s) => acc + s.lessons.length, 0);

  return (
    <>
      {/* Course includes — needs section count */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { icon: PlayCircle, text: `${formatDuration(totalDuration)} ${t("onDemandVideo")}` },
          { icon: FileText, text: `${sections.length} sections, ${totalLessons} lessons` },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-[--color-text-secondary]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary-subtle]">
              <Icon className="h-4 w-4 text-[--color-primary]" />
            </span>
            {text}
          </div>
        ))}
      </div>

      <Separator className="my-10" />

      <section>
        <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">{t("curriculum")}</h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          {t("curriculumMeta", {
            sections: sections.length,
            lessons: totalLessons,
            duration: formatDuration(totalDuration),
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
    </>
  );
}

function CurriculumSkeleton() {
  return (
    <div className="space-y-3 mt-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-12 rounded-[--radius-md]" />
      ))}
    </div>
  );
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const [course, t] = await Promise.all([
    getCourse(slug),
    getTranslations("course"),
  ]);

  if (!course || course.status !== "published") notFound();

  const price = course.is_free ? t("free") : `$${(course.price_in_cents / 100).toFixed(2)}`;
  const totalLessons = course.total_lessons ?? 0;

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

      {/* Course hero — renders immediately from single course fetch */}
      <div className="relative overflow-hidden bg-[image:var(--gradient-hero)] text-white">
        {/* Decorative atmosphere — pure visual */}
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-[--brand-500] opacity-20 blur-[110px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-[12%] h-64 w-64 rounded-full bg-[oklch(55%_0.24_320)] opacity-15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-2xl stagger-children">
            <nav className="mb-5 flex items-center gap-2 text-xs">
              <Link
                href="/courses"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
              >
                {t("courses")}
              </Link>
              <span className="text-white/30">/</span>
              <span className="truncate text-white/60">{course.title}</span>
            </nav>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {course.title}
            </h1>

            {course.description && (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 line-clamp-3">
                {course.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge variant="default" className="border-0 bg-[image:var(--gradient-brand)] px-3 py-1 text-xs font-semibold text-white shadow-[var(--shadow-brand)]">
                {levelLabels[course.level] ?? course.level}
              </Badge>
              {course.review_count > 0 && (
                <StarRating rating={course.rating} count={course.review_count} />
              )}
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                <Users className="h-3.5 w-3.5" />
                {t("students", { count: course.enrollment_count.toLocaleString() })}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-5 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[--brand-300]" />
                {course.language}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[--brand-300]" />
                {formatDuration(course.total_duration_seconds)} total
              </span>
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5 text-[--brand-300]" />
                  {totalLessons} {t("lessons").toLowerCase()}
                </span>
              )}
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
            <section className="animate-fade-up">
              <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">{t("whatYoullLearn")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] p-6 shadow-[var(--shadow-sm)] sm:grid-cols-2">
                {learnItems.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[--color-success]" />
                    <span className="text-sm leading-relaxed text-[--color-text-secondary]">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Static includes (no section count needed) */}
            <section className="mt-10">
              <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">{t("includes")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { icon: BarChart, text: levelLabels[course.level] ?? course.level },
                  { icon: Award, text: t("certificateCompletion") },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-[--color-text-secondary]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[--radius-sm] bg-[--color-primary-subtle]">
                      <Icon className="h-4 w-4 text-[--color-primary]" />
                    </span>
                    {text}
                  </div>
                ))}
              </div>
              {/* Dynamic section/lesson counts stream in */}
              <Suspense fallback={<CurriculumSkeleton />}>
                <CourseCurriculumSection
                  courseId={course.id}
                  totalDuration={course.total_duration_seconds}
                />
              </Suspense>
            </section>

            <Separator className="my-10" />

            <ReviewSection courseId={course.id} initialReviews={[]} />

            <Separator className="my-10" />

            <RecommendationsSection currentCourseId={course.id} />

            <Separator className="my-10" />

            <section>
              <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">Discussion</h2>
              <p className="mt-1 text-sm text-[--color-text-muted]">
                Ask questions, share insights, or start a conversation with other students.
              </p>
              <div className="mt-6">
                <Suspense fallback={<div className="skeleton-shimmer h-24 rounded-[--radius-md]" />}>
                  <DiscussionSection courseId={course.id} theme="light" />
                </Suspense>
              </div>
            </section>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="sticky top-24 animate-scale-in overflow-hidden rounded-[--radius-lg] border border-[--color-border] bg-[--color-surface-raised] shadow-[var(--shadow-xl)]">
              <div className="group relative aspect-video overflow-hidden bg-[image:var(--gradient-hero)]">
                {course.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[var(--shadow-lg)] transition-transform duration-300 group-hover:scale-110">
                      <PlayCircle className="h-9 w-9 text-[--color-primary]" />
                    </span>
                  </div>
                )}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-card-sheen)]" />
              </div>

              <div className="p-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold tracking-tight text-[--color-text-primary]">{price}</span>
                </div>

                <EnrollButton courseId={course.id} isFree={course.is_free} priceInCents={course.price_in_cents} />
                <div className="mt-2">
                  <WishlistButton courseId={course.id} />
                </div>

                <p className="mt-4 text-center text-xs text-[--color-text-muted]">
                  {t("moneyBack")}
                </p>

                <Separator className="my-5" />

                <div className="space-y-2.5 text-sm">
                  {[
                    { label: t("level"), value: levelLabels[course.level] ?? course.level },
                    { label: t("language"), value: course.language },
                    { label: t("duration"), value: formatDuration(course.total_duration_seconds) },
                    ...(totalLessons > 0 ? [{ label: t("lessons"), value: totalLessons.toString() }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[--color-text-muted]">{label}</span>
                      <span className="font-semibold text-[--color-text-secondary]">{value}</span>
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
