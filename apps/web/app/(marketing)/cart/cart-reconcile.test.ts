import { describe, expect, it } from "vitest";

import { getCartCourseIdsToRemove } from "./cart-reconcile";

describe("getCartCourseIdsToRemove", () => {
  it("returns course ids already enrolled", () => {
    expect(
      getCartCourseIdsToRemove(
        [
          {
            courseId: "course-1",
            slug: "course-1",
            title: "Course 1",
            priceInCents: 1000,
            isFree: false,
          },
          {
            courseId: "course-2",
            slug: "course-2",
            title: "Course 2",
            priceInCents: 2000,
            isFree: false,
          },
        ],
        ["course-2", "course-3"]
      )
    ).toEqual(["course-2"]);
  });

  it("returns empty list when cart has no enrolled courses", () => {
    expect(
      getCartCourseIdsToRemove(
        [
          {
            courseId: "course-1",
            slug: "course-1",
            title: "Course 1",
            priceInCents: 1000,
            isFree: false,
          },
        ],
        ["course-9"]
      )
    ).toEqual([]);
  });
});
