import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold shadow-[var(--shadow-xs)] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[image:var(--gradient-brand)] text-white",
        secondary: "border border-[--color-border] bg-[--color-primary-subtle] text-[--brand-800]",
        outline: "border border-[--color-border] bg-[--color-surface-raised] text-[--color-text-secondary]",
        success: "bg-[--color-success]/10 text-[--color-success]",
        destructive: "bg-[--color-error]/10 text-[--color-error]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
