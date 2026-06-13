import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOptionalAuth } from "./optional-auth";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

describe("getOptionalAuth", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns auth result when Clerk middleware context exists", async () => {
    const authResult = {
      userId: "user_123",
      getToken: vi.fn(),
    };
    authMock.mockResolvedValue(authResult);

    await expect(getOptionalAuth()).resolves.toBe(authResult);
  });

  it("returns null when Clerk middleware detection fails", async () => {
    authMock.mockRejectedValue(
      new Error("auth() was called but Clerk can't detect usage of clerkMiddleware().")
    );

    await expect(getOptionalAuth()).resolves.toBeNull();
  });

  it("rethrows unrelated Clerk errors", async () => {
    const error = new Error("network down");
    authMock.mockRejectedValue(error);

    await expect(getOptionalAuth()).rejects.toBe(error);
  });
});
