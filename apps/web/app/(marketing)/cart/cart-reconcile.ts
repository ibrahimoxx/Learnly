import type { CartItem } from "@/lib/stores/cart-store";

export function getCartCourseIdsToRemove(
  items: CartItem[],
  enrolledCourseIds: string[],
): string[] {
  const enrolledSet = new Set(enrolledCourseIds);
  return items
    .filter((item) => enrolledSet.has(item.courseId))
    .map((item) => item.courseId);
}
