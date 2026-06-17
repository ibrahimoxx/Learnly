"use client";

import type { CSSProperties, ReactNode } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  variant?: "slide" | "scale";
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.15,
  variant = "slide",
}: RevealProps) {
  const ref = useScrollReveal(threshold);
  const revealClass = variant === "scale" ? "scroll-reveal-scale" : "scroll-reveal";
  const style: CSSProperties = { transitionDelay: `${delay}s` };

  return (
    <div ref={ref} className={`${revealClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
