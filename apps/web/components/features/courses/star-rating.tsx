import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
}

export function StarRating({ rating, count, size = "sm", showCount = true }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-1">
      <span className={cn("font-semibold text-[--color-star]", size === "sm" ? "text-xs" : "text-sm")}>
        {Number(rating).toFixed(1)}
      </span>
      <div className="flex items-center">
        {stars.map((star) => (
          <Star
            key={star}
            className={cn(
              "fill-current",
              size === "sm" ? "h-3 w-3" : "h-4 w-4",
              star <= Math.round(rating) ? "text-[--color-star]" : "text-[--color-border]"
            )}
          />
        ))}
      </div>
      {showCount && count !== undefined && (
        <span className={cn("text-[--color-text-muted]", size === "sm" ? "text-xs" : "text-sm")}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
