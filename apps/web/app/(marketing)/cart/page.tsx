import { getViewerEnrollments } from "@/lib/server/enrollments";
import { CartClient } from "./cart-client";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const enrollments = await getViewerEnrollments();
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.course_id);

  return <CartClient enrolledCourseIds={enrolledCourseIds} />;
}
