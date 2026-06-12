import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { LearningPath } from "@/types";

export const metadata: Metadata = { title: "Learning Paths" };

async function getPaths(): Promise<LearningPath[]> {
  try {
    return await apiFetch<LearningPath[]>("/api/v1/learning-paths");
  } catch {
    return [];
  }
}

export default async function PathsPage() {
  const paths = await getPaths();

  return (
    <div className="premium-shell min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto mb-8 max-w-7xl">
        <span className="inline-flex rounded-full bg-[--color-primary-subtle] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[--brand-800]">
          Guided growth
        </span>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[--color-text-primary] sm:text-5xl">Learning Paths</h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Curated sequences of courses to take you from beginner to expert.
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="premium-card mx-auto flex max-w-7xl flex-col items-center justify-center rounded-[--radius-lg] py-20 text-center">
          <img src="/brand/empty-state.svg" alt="" className="mb-4 h-32 w-auto" />
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-primary-subtle]">
            <GraduationCap className="h-7 w-7 text-[--color-primary]" />
          </span>
          <p className="relative mt-3 font-extrabold text-[--color-text-secondary]">No learning paths yet</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">Check back soon — instructors are building paths.</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {paths.map((path) => (
            <PathCard key={path.id} path={path} />
          ))}
        </div>
      )}
    </div>
  );
}

function PathCard({ path }: { path: LearningPath }) {
  return (
    <Link
      href={`/paths/${path.slug}`}
      className="group hover-lift premium-card block rounded-[--radius-lg]"
    >
      {path.image_url ? (
        <div className="sheen-overlay relative aspect-video overflow-hidden bg-[--color-surface]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={path.image_url} alt={path.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      ) : (
        <div className="thumbnail-fallback flex aspect-video items-center justify-center">
          <GraduationCap className="h-16 w-16 rounded-[--radius-lg] border border-white/18 bg-white/10 p-3 text-white shadow-[var(--shadow-lg)] backdrop-blur" />
        </div>
      )}

      <div className="relative p-4">
        <h2 className="line-clamp-2 font-heading text-base font-black leading-tight text-[--color-text-primary] group-hover:text-[--color-primary] transition-colors">
          {path.title}
        </h2>
        {path.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-[--color-text-muted]">{path.description}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[--color-text-secondary]">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{path.course_count} course{path.course_count !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </Link>
  );
}
