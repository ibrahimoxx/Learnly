import { Lock } from "lucide-react";
import Link from "next/link";
import type { Lesson } from "@/types";

interface Props {
  lesson: Lesson;
}

function formatUnlockDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LockedLesson({ lesson }: Props) {
  const unlockDate = lesson.unlock_at ? formatUnlockDate(lesson.unlock_at) : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      style={{ background: "oklch(10% 0.02 295)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Lock className="h-8 w-8 text-white/70" />
        </div>
        <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
        {unlockDate && (
          <p className="text-base text-white/60">
            Available on <span className="text-white/90 font-medium">{unlockDate}</span>
          </p>
        )}
        <p className="max-w-sm text-sm text-white/40">
          This lesson hasn't unlocked yet. Check back on the unlock date to continue.
        </p>
      </div>
      <Link
        href="/courses"
        className="rounded-md bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
      >
        Browse other courses
      </Link>
    </div>
  );
}
