import { getViewerEnrollments } from "@/lib/server/enrollments";
import { CartClient } from "./cart-client";

export default async function CartPage() {
  const enrollments = await getViewerEnrollments();
  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.course_id);

  return <CartClient enrolledCourseIds={enrolledCourseIds} />;
}
