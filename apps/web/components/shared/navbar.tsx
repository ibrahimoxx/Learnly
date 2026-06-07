"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { Search, BookOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/notification-bell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

const navLinkClass = "px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors";
const mobileNavLinkClass = "py-2 text-sm font-medium text-neutral-600";

export function Navbar() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string | undefined;
  const isInstructor = role === "instructor" || role === "admin";
  const isAdmin = role === "admin";
  const router = useRouter();
  const t = useTranslations("nav");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const signedIn = mounted && isSignedIn;

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2 font-bold text-neutral-900">
            <BookOpen className="h-6 w-6 text-violet-600" />
            <span className="text-lg">Learnly</span>
          </div>
        </div>
      </header>
    );
  }

  // After mount, preserve current page + query params (including ?ref=) so Clerk
  // redirects back here after sign in / sign up instead of going to /dashboard.
  const returnTo = window.location.pathname + window.location.search;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/courses");
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-neutral-900">
          <BookOpen className="h-6 w-6 text-violet-600" />
          <span className="text-lg">Learnly</span>
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden flex-1 lg:flex max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9 rounded-full border-neutral-200"
            />
          </div>
        </form>

        {/* Nav links — desktop */}
        <nav className="hidden items-center gap-1 lg:flex ml-2">
          <Link href="/courses" className={navLinkClass}>{t("explore")}</Link>
          <Link href="/paths" className={navLinkClass}>Paths</Link>
          {signedIn && (
            <>
              <Link href="/dashboard" className={navLinkClass}>{t("myLearning")}</Link>
              <Link href="/wishlist" className={navLinkClass}>{t("wishlist")}</Link>
              {isInstructor && (
                <Link href="/instructor/courses" className={navLinkClass}>{t("teach")}</Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth + language — desktop */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <NotificationBell />
          {signedIn ? (
            <UserButton fallbackRedirectUrl="/" />
          ) : (
            <>
              <SignInButton mode="modal" forceRedirectUrl={returnTo}>
                <Button variant="outline" size="sm">{t("login")}</Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl={returnTo}>
                <Button size="sm">{t("signup")}</Button>
              </SignUpButton>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="ml-auto lg:hidden p-2 text-neutral-600"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-4 lg:hidden">
          <form onSubmit={handleSearch} className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 rounded-full"
              />
            </div>
          </form>
          <nav className="flex flex-col gap-1">
            <Link href="/courses" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("explore")}</Link>
            <Link href="/paths" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>Paths</Link>
            {signedIn && (
              <>
                <Link href="/dashboard" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("myLearning")}</Link>
                <Link href="/wishlist" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("wishlist")}</Link>
                {isInstructor && (
                  <Link href="/instructor/courses" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("teach")}</Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="py-2 text-sm font-medium text-red-600" onClick={() => setMobileOpen(false)}>Admin</Link>
                )}
              </>
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between">
            <LanguageSwitcher />
            <div className={cn("flex gap-2", signedIn && "justify-start")}>
              {signedIn ? (
                <UserButton fallbackRedirectUrl="/" />
              ) : (
                <>
                  <SignInButton mode="modal" forceRedirectUrl={returnTo}>
                    <Button variant="outline" size="sm">{t("login")}</Button>
                  </SignInButton>
                  <SignUpButton mode="modal" forceRedirectUrl={returnTo}>
                    <Button size="sm">{t("signup")}</Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
