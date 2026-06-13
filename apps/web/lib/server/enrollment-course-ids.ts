import type { Enrollment } from "@/types";

export function getEnrollmentCourseIds(enrollments: Enrollment[]): string[] {
  return Array.from(new Set(enrollments.map((enrollment) => enrollment.course_id)));
}
