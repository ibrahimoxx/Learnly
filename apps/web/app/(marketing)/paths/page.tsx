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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Learning Paths</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Curated sequences of courses to take you from beginner to expert.
        </p>
      </div>

      {paths.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-[--color-border] py-20 text-center">
          <GraduationCap className="h-12 w-12 text-[--color-border]" />
          <p className="mt-3 font-semibold text-[--color-text-secondary]">No learning paths yet</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">Check back soon — instructors are building paths.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      className="group block overflow-hidden rounded-[--radius-md] border border-[--color-border] bg-white transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,.12)]"
    >
      {path.image_url ? (
        <div className="relative aspect-video overflow-hidden bg-[--color-surface]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={path.image_url} alt={path.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-linear-to-br from-[--color-primary]/10 to-[--color-primary]/5">
          <GraduationCap className="h-14 w-14 text-[--color-primary]/40" />
        </div>
      )}

      <div className="p-4">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-[--color-text-primary] group-hover:text-[--color-primary] transition-colors">
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
