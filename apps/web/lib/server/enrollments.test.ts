import { describe, expect, it } from "vitest";

import { getEnrollmentCourseIds, hasEnrollmentForCourse } from "./enrollment-course-ids";

describe("getEnrollmentCourseIds", () => {
  it("returns unique owned course ids", () => {
    expect(
      getEnrollmentCourseIds([
        { id: "enr-1", course_id: "course-1" } as never,
        { id: "enr-2", course_id: "course-2" } as never,
        { id: "enr-3", course_id: "course-1" } as never,
      ])
    ).toEqual(["course-1", "course-2"]);
  });
});

describe("hasEnrollmentForCourse", () => {
  it("matches by course id", () => {
    expect(
      hasEnrollmentForCourse(
        [{ course_id: "course-1", course_slug: "course-one" } as never],
        "course-1",
        "different-slug",
      ),
    ).toBe(true);
  });

  it("matches by course slug when id differs", () => {
    expect(
      hasEnrollmentForCourse(
        [{ course_id: "legacy-id", course_slug: "python-for-beginners-e7cd87" } as never],
        "new-id",
        "python-for-beginners-e7cd87",
      ),
    ).toBe(true);
  });
});
