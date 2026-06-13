import { describe, expect, it } from "vitest";

import { getEnrollmentCourseIds } from "./enrollment-course-ids";

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
