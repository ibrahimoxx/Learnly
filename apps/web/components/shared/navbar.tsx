"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SignInButton, SignUpButton, useAuth, useUser, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { Search, Menu, X, ShoppingCart, User, GraduationCap, ShoppingBag, Settings, Bell, Award, HelpCircle, LogOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/notification-bell";
import { MessageNavLink } from "@/components/shared/message-nav-link";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useCartStore } from "@/lib/stores/cart-store";
import { useInstallStore } from "@/lib/stores/install-store";
import { toast } from "sonner";

const navLinkClass = "rounded-full px-3.5 py-2 text-sm font-extrabold text-[--color-text-secondary] hover:bg-[--color-primary-subtle] hover:text-[--brand-800] transition-colors";
const mobileNavLinkClass = "rounded-[--radius-sm] px-3 py-2 text-sm font-extrabold text-[--color-text-secondary] hover:bg-[--color-primary-subtle] hover:text-[--brand-800] transition-colors";

type ClerkUser = ReturnType<typeof useUser>["user"];

const USER_MENU_ITEMS = [
  { label: "My Learning",    href: "/dashboard",                         icon: GraduationCap },
  { label: "Profile",        href: "/user/edit-profile",                 icon: User },
  { label: "My Purchases",   href: "/user/edit-profile/purchase-history",icon: ShoppingBag },
  { label: "Settings",       href: "/user/edit-profile",                 icon: Settings },
  { label: "Notifications",  href: "/notifications",                     icon: Bell },
  { label: "Accomplishments",href: "/home/my-courses/completed",         icon: Award },
  { label: "Help Center",    href: "/help",                              icon: HelpCircle },
] as const;

function UserMenu({ user }: { user: ClerkUser }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const initials = user
    ? `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?"
    : "?";
  const avatar = user?.imageUrl;

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-black text-white transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]"
        style={{ background: avatar ? "transparent" : "linear-gradient(135deg,#1c4ed8,#6d28d9)" }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {avatar ? (
          <img src={avatar} alt={initials} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[13px]">{initials}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
        >
          {/* User info header */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-[13px] font-bold text-gray-900 truncate">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          {/* Menu items */}
          <nav className="py-1">
            {USER_MENU_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Divider + logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => signOut(() => router.push("/"))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const { items } = useCartStore();
  const deferredPrompt = useInstallStore((state) => state.deferredPrompt);
  const isInstalled = useInstallStore((state) => state.isInstalled);
  const setDeferredPrompt = useInstallStore((state) => state.setDeferredPrompt);
  const cartCount = mounted ? items.length : 0;
  const showInstallButton = !isInstalled;

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-[--color-surface-glass] shadow-[var(--shadow-sm)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2 font-extrabold text-[--color-text-primary]">
            <Image src="/brand/learnly-logo-generated.png" alt="Learnly" width={36} height={36} className="rounded-[--radius-sm]" unoptimized />
            <span className="font-heading text-xl">Learnly</span>
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

  async function handleInstall() {
    if (!deferredPrompt) {
      toast.info("Open your browser menu and choose \"Install app\" to add Learnly.");
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-[--color-surface-glass] shadow-[var(--shadow-sm)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2 font-extrabold text-[--color-text-primary]">
          <Image src="/brand/learnly-logo-generated.png" alt="Learnly" width={36} height={36} className="rounded-[--radius-sm] transition-transform group-hover:-rotate-3 group-hover:scale-105" unoptimized />
          <span className="font-heading text-xl">Learnly</span>
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden flex-1 lg:flex max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-10 rounded-full border-[--color-border] bg-[--color-surface-glass] pl-9 shadow-[var(--shadow-xs)] backdrop-blur focus-visible:bg-[--color-background] transition-colors"
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
                <Link href="/admin" className="rounded-full px-3.5 py-2 text-sm font-extrabold text-[--color-error] hover:bg-[--color-error]/10 transition-colors">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth + language — desktop */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          {showInstallButton && (
            <button
              onClick={handleInstall}
              aria-label="Install app"
              title="Install app"
              className="hover-lift flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition-transform"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          )}
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[--color-text-secondary] transition-colors hover:bg-[--color-primary-subtle] hover:text-[--brand-800]"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--color-primary] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <MessageNavLink />
          <NotificationBell />
          {signedIn ? (
            <UserMenu user={user} />
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
          className="ml-auto lg:hidden p-2 text-[--color-text-secondary]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/60 bg-[--color-surface-glass] px-4 pb-4 shadow-[var(--shadow-lg)] backdrop-blur-xl lg:hidden">
          <form onSubmit={handleSearch} className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 rounded-full bg-[--color-surface-raised] pl-9 shadow-[var(--shadow-xs)]"
              />
            </div>
          </form>
          <nav className="flex flex-col gap-1">
            <Link href="/courses" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("explore")}</Link>
            <Link href="/paths" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>Paths</Link>
            <Link href="/cart" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
            {signedIn && (
              <>
                <Link href="/dashboard" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("myLearning")}</Link>
                <Link href="/wishlist" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("wishlist")}</Link>
                <Link href="/user/edit-profile/messages" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>Messages</Link>
                {isInstructor && (
                  <Link href="/instructor/courses" className={mobileNavLinkClass} onClick={() => setMobileOpen(false)}>{t("teach")}</Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="py-2 text-sm font-medium text-[--color-error]" onClick={() => setMobileOpen(false)}>Admin</Link>
                )}
              </>
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between">
            <LanguageSwitcher />
            <div className={cn("flex gap-2", signedIn && "justify-start")}>
              {showInstallButton && (
                <button
                  onClick={handleInstall}
                  aria-label="Install app"
                  title="Install app"
                  className="hover-lift flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition-transform"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <Download className="h-4 w-4" />
                  Install
                </button>
              )}
              {signedIn ? (
                <UserMenu user={user} />
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
