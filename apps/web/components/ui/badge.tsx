import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[--color-primary] text-white",
        secondary: "bg-[--color-surface] text-[--color-text-secondary]",
        outline: "border border-[--color-border] text-[--color-text-secondary]",
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
