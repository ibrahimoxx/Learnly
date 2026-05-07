"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-2xl font-bold text-[--color-text-primary]">Something went wrong</h1>
      <p className="text-sm text-[--color-text-muted]">An unexpected error occurred. Please try again.</p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">Try again</Button>
        <Link href="/"><Button>Go home</Button></Link>
      </div>
    </div>
  );
}
