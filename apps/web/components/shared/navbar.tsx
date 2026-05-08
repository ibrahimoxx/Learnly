"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { Search, BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/courses");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[--color-border] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-[--color-text-primary]">
          <BookOpen className="h-6 w-6 text-[--color-primary]" />
          <span className="text-lg">Learnly</span>
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden flex-1 lg:flex max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything"
              className="pl-9 rounded-full border-[--color-border]"
            />
          </div>
        </form>

        {/* Nav links — desktop */}
        <nav className="hidden items-center gap-1 lg:flex ml-2">
          <Link
            href="/courses"
            className="px-3 py-2 text-sm font-medium text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
          >
            Explore
          </Link>
          {isSignedIn && (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
              >
                My Learning
              </Link>
              <Link
                href="/instructor/courses"
                className="px-3 py-2 text-sm font-medium text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors"
              >
                Teach
              </Link>
            </>
          )}
        </nav>

        {/* Auth — desktop */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">Log in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="ml-auto lg:hidden p-2 text-[--color-text-secondary]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[--color-border] bg-white px-4 pb-4 lg:hidden">
          <form onSubmit={handleSearch} className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anything"
                className="pl-9 rounded-full"
              />
            </div>
          </form>
          <nav className="flex flex-col gap-1">
            <Link href="/courses" className="py-2 text-sm font-medium text-[--color-text-secondary]" onClick={() => setMobileOpen(false)}>
              Explore
            </Link>
            {isSignedIn && (
              <>
                <Link href="/dashboard" className="py-2 text-sm font-medium text-[--color-text-secondary]" onClick={() => setMobileOpen(false)}>
                  My Learning
                </Link>
                <Link href="/instructor/courses" className="py-2 text-sm font-medium text-[--color-text-secondary]" onClick={() => setMobileOpen(false)}>
                  Teach
                </Link>
              </>
            )}
          </nav>
          <div className={cn("mt-3 flex gap-2", isSignedIn && "justify-start")}>
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="flex-1">Log in</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="flex-1">Sign up</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
