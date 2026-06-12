import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-shell flex min-h-screen flex-col">
      <header className="border-b border-white/60 bg-[--color-surface-glass] shadow-[var(--shadow-sm)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-[--color-text-primary]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-sm] bg-[image:var(--gradient-brand)] text-white shadow-[var(--shadow-brand)]">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-heading text-xl">Learnly</span>
          </Link>
        </div>
      </header>
      <main className="grid flex-1 items-center gap-10 px-4 py-12 lg:grid-cols-[1fr_420px] lg:px-12">
        <div className="hidden max-w-2xl justify-self-end lg:block">
          <img src="/brand/hero-orbit.svg" alt="" className="h-auto w-full drop-shadow-2xl" />
        </div>
        <div className="justify-self-center rounded-[--radius-xl] border border-white/70 bg-[--color-surface-glass] p-3 shadow-[var(--shadow-xl)] backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
