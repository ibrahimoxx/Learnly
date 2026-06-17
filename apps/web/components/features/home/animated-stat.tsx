"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  Award,
  PlayCircle,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { easeOutCubic, formatAnimatedValue } from "./animated-stat.utils";

const ICONS = {
  courses: PlayCircle,
  rating: TrendingUp,
  reviews: Award,
  students: Users,
} satisfies Record<string, LucideIcon>;

export type AnimatedStatIconName = keyof typeof ICONS;

interface AnimatedStatProps {
  decimals?: number;
  delay?: number;
  fallback?: string;
  iconName: AnimatedStatIconName;
  label: string;
  suffix?: string;
  value: number | null;
}

function useCountUp(value: number | null, ref: RefObject<HTMLDivElement | null>) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === null) return;

    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (!entry.isIntersecting) return;

        const startedAt = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / 1500, 1);
          setDisplayValue(value * easeOutCubic(progress));
          if (progress < 1) frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [ref, value]);

  return displayValue;
}

export function AnimatedStat({
  decimals = 0,
  delay = 0,
  fallback = "\u2014",
  iconName,
  label,
  suffix = "",
  value,
}: AnimatedStatProps) {
  const ref = useScrollReveal(0.2);
  const displayValue = useCountUp(value, ref);
  const Icon = ICONS[iconName];
  const textValue =
    value === null ? fallback : `${formatAnimatedValue(displayValue, decimals)}${suffix}`;

  return (
    <div
      ref={ref}
      className="scroll-reveal premium-card flex items-center gap-3 rounded-[--radius-md] p-4"
      style={{ transitionDelay: `${delay}s` }}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-[--color-primary-subtle]">
        <Icon className="h-5 w-5 text-[--color-primary]" />
      </div>
      <div className="relative">
        <p className="text-lg font-bold text-[--color-text-primary]">{textValue}</p>
        <p className="text-xs text-[--color-text-muted]">{label}</p>
      </div>
    </div>
  );
}
