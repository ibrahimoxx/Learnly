import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Award, BookOpen, Calendar, Globe, Star, Users } from "lucide-react";
import { CourseCard } from "@/components/features/courses/course-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getViewerEnrollmentCourseIds } from "@/lib/server/enrollments";
import type { CourseListResponse, InstructorProfile } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getInstructorProfile(id: string) {
  try {
    return await apiFetch<InstructorProfile>(`/api/v1/users/${id}/profile`);
  } catch {
    return null;
  }
}

async function getInstructorCourses(id: string) {
  try {
    return await apiFetch<CourseListResponse>(`/api/v1/users/${id}/courses?limit=24`);
  } catch {
    return { items: [], total: 0, page: 1, limit: 24, total_pages: 0 };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getInstructorProfile(id);
  if (!profile) return { title: "Instructor not found" };
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  return {
    title: `${name} — Instructor on Learnly`,
    description: profile.bio ?? `Courses by ${name} on Learnly.`,
  };
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function InstructorProfilePage({ params }: Props) {
  const { id } = await params;
  const [profile, t] = await Promise.all([getInstructorProfile(id), getTranslations("instructor")]);

  if (!profile) notFound();

  const [{ items: courses }, ownedCourseIds] = await Promise.all([
    getInstructorCourses(id),
    getViewerEnrollmentCourseIds(),
  ]);
  const ownedCourseIdSet = new Set(ownedCourseIds);
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  const memberSinceYear = new Date(profile.created_at).getFullYear();

  const stats = [
    { icon: BookOpen, label: t("courses"), value: profile.total_courses.toLocaleString() },
    { icon: Users, label: t("students"), value: profile.total_students.toLocaleString() },
    {
      icon: Star,
      label: t("rating"),
      value: profile.total_reviews > 0 ? Number(profile.avg_rating).toFixed(1) : "—",
    },
    { icon: Award, label: t("reviews"), value: profile.total_reviews.toLocaleString() },
  ];

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
            <span className="truncate text-white/60">{name}</span>
          </nav>

          <div className="stagger-children flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar className="animate-scale-in h-24 w-24 border-4 border-white/20 shadow-[var(--shadow-lg)]">
              {profile.image_url && <AvatarImage src={profile.image_url} alt={name} />}
              <AvatarFallback className="bg-white/10 text-3xl font-black text-white">
                {initials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>

            <div className="animate-fade-up">
              <h1 className="font-heading text-4xl font-black tracking-tight sm:text-5xl">{name}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/70">
                <Calendar className="h-3.5 w-3.5 text-[--brand-300]" />
                {t("memberSince", { year: memberSinceYear })}
              </p>
              {profile.bio && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75 line-clamp-3">
                  {profile.bio}
                </p>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t("website")}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="stagger-children mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="animate-fade-up rounded-[--radius-lg] border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-white/60">
                  <Icon className="h-4 w-4 text-[--brand-300]" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                </div>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body — courses grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight text-[--color-text-primary]">
          {t("coursesByLabel", { name })}
        </h2>

        {courses.length > 0 ? (
          <>
            <div className="stagger-children mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="premium-card mt-4 flex flex-col items-center justify-center rounded-[--radius-lg] py-20 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-[--color-text-muted]" />
            <p className="relative text-base font-extrabold text-[--color-text-secondary]">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-[--color-text-muted]">{t("emptyDescription")}</p>
            <Link href="/courses" className="mt-6">
              <Button>{t("browseAll")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
