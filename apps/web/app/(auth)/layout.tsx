import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[--color-border] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-[--color-text-primary]">
            <BookOpen className="h-5 w-5 text-[--color-primary]" />
            <span>Learnly</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center bg-[--color-surface] px-4 py-12">
        {children}
      </main>
    </div>
  );
}
