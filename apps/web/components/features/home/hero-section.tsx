"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";

const GENERATED_LOGO_SRC = "/brand/learnly-logo-generated.png";
// Higgsfield video generation was blocked on 2026-06-17 by current free-plan credits.
// Replace with a fresh Higgsfield URL when the account can generate video again.
const HERO_VIDEO_URL = "";

interface HeroTag {
  href: string;
  label: string;
}

interface HeroSectionProps {
  badgeText: string;
  popularLabel: string;
  popularTags: HeroTag[];
  searchButton: string;
  searchPlaceholder: string;
  subtitle: string;
  title: string;
}

function fadeUp(delay: number, duration: number) {
  return { animation: `fade-up ${duration}s ease ${delay}s both` };
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#08080f 0%,#0d0d2b 45%,#1a0a38 100%)" }}>
      {HERO_VIDEO_URL ? (
        <video autoPlay className="absolute inset-0 h-full w-full object-cover" loop muted playsInline src={HERO_VIDEO_URL} />
      ) : (
        <>
          {/* Animated aurora orbs */}
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          {/* Noise grain */}
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }} />
        </>
      )}
      {/* Dark left vignette so text is always readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/40" />
    </div>
  );
}

function HeroCopy({
  badgeText,
  popularLabel,
  popularTags,
  searchButton,
  searchPlaceholder,
  subtitle,
  title,
}: HeroSectionProps) {
  return (
    <div className="max-w-3xl">
      <span
        className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.24em] text-white/76 shadow-[var(--shadow-sm)] backdrop-blur-xl"
        style={fadeUp(0.1, 0.6)}
      >
        {badgeText}
      </span>
      <h1
        className="mt-6 max-w-3xl text-5xl font-black leading-none tracking-[-0.04em] sm:text-6xl lg:text-7xl"
        style={fadeUp(0.25, 0.7)}
      >
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-white/74" style={fadeUp(0.4, 0.6)}>
        {subtitle}
      </p>
      <form
        action="/courses"
        className="mt-8 flex w-full max-w-2xl overflow-hidden rounded-full border border-white/20 bg-white/12 p-1 shadow-[var(--shadow-xl)] backdrop-blur-xl"
        style={fadeUp(0.55, 0.6)}
      >
        <div className="flex flex-1 items-center gap-2 px-4">
          <Search className="h-4 w-4 shrink-0 text-white/60" />
          <input
            className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/50 focus:outline-none"
            name="q"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
        <button
          className="rounded-full bg-white px-6 py-2 text-sm font-extrabold text-[--brand-800] shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5 hover:bg-white/90"
          type="submit"
        >
          {searchButton}
        </button>
      </form>
      <div className="mt-5" style={fadeUp(0.7, 0.6)}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
          {popularLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Link
              key={tag.href}
              className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold text-white/82 transition-colors hover:bg-white/16"
              href={tag.href}
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroLogoOrb() {
  return (
    <div className="relative hidden min-h-[420px] items-center justify-center lg:flex">
      <div className="absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(131,106,255,0.28),transparent_58%)] blur-3xl" />
      <div
        className="relative flex h-[320px] w-[320px] items-center justify-center rounded-full border border-white/10 bg-white/8 shadow-[0_0_120px_rgba(88,92,255,0.32)] backdrop-blur-2xl"
        style={{ animation: "float 3s ease-in-out infinite" }}
      >
        <div className="absolute inset-6 rounded-full border border-white/10" />
        <Image
          alt="Learnly logo"
          className="h-[248px] w-[248px] object-contain drop-shadow-[0_0_60px_rgba(101,112,255,0.45)]"
          height={300}
          priority
          src={GENERATED_LOGO_SRC}
          unoptimized
          width={300}
        />
      </div>
    </div>
  );
}

function ScrollCue() {
  return (
    <a
      aria-label="Scroll to platform stats"
      className="absolute bottom-8 left-1/2 z-20 rounded-full border border-white/15 bg-white/10 p-3 text-white/80 backdrop-blur"
      href="#learnly-stats"
      style={{ animation: "bounce-down 1.8s ease-in-out infinite" }}
    >
      <ChevronDown className="h-5 w-5" />
    </a>
  );
}

export function HeroSection(props: HeroSectionProps) {
  return (
    <section className="relative isolate min-h-[50vh] overflow-hidden bg-[--color-hero] text-white">
      <HeroBackground />
      <div className="relative z-20 flex min-h-[50vh] items-center px-4 py-12 sm:px-6">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <HeroCopy {...props} />
          <HeroLogoOrb />
        </div>
      </div>
      <ScrollCue />
    </section>
  );
}
