import type { Enrollment } from "@/types";

export function getEnrollmentCourseIds(enrollments: Enrollment[]): string[] {
  return Array.from(new Set(enrollments.map((enrollment) => enrollment.course_id)));
}

export function hasEnrollmentForCourse(
  enrollments: Enrollment[],
  courseId: string,
  courseSlug?: string,
): boolean {
  return enrollments.some(
    (enrollment) =>
      enrollment.course_id === courseId
      || (courseSlug !== undefined && enrollment.course_slug === courseSlug),
  );
}
