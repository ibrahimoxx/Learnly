import { describe, expect, it } from "vitest";

import { publicRoutes } from "./middleware";

describe("publicRoutes", () => {
  it("keeps cart accessible without auth protection", () => {
    expect(publicRoutes).toContain("/cart(.*)");
  });
});
