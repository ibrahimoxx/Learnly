import { describe, expect, it } from "vitest";
import { easeOutCubic, formatAnimatedValue } from "./animated-stat.utils";

describe("easeOutCubic", () => {
  it("clamps progress below zero", () => {
    expect(easeOutCubic(-0.25)).toBe(0);
  });

  it("returns one at animation end", () => {
    expect(easeOutCubic(1)).toBe(1);
  });
});

describe("formatAnimatedValue", () => {
  it("formats grouped integers", () => {
    expect(formatAnimatedValue(12345)).toBe("12,345");
  });

  it("keeps fixed decimals", () => {
    expect(formatAnimatedValue(4.2, 1)).toBe("4.2");
  });
});
