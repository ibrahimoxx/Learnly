import { WifiOff } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[--color-surface]">
        <WifiOff className="h-10 w-10 text-[--color-text-muted]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[--color-text-primary]">You&rsquo;re offline</h1>
        <p className="mt-2 text-sm text-[--color-text-muted] max-w-xs">
          Check your internet connection and try again. Your progress is saved.
        </p>
      </div>
      <div className="flex gap-3">
        <RetryButton />
        <Link
          href="/"
          className="rounded-[--radius-sm] border border-[--color-border] bg-white px-5 py-2.5 text-sm font-semibold text-[--color-text-secondary] hover:border-[--color-primary]/50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
