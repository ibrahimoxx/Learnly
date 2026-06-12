"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[image:var(--gradient-brand)] text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
        secondary:
          "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:border-[var(--brand-200)] hover:bg-[var(--color-primary-subtle)]",
        ghost:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--brand-800)]",
        outline:
          "border border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] backdrop-blur hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
        destructive:
          "bg-[var(--color-error)] text-white hover:opacity-90",
        link:
          "text-[var(--color-primary)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
