import { describe, expect, it } from "vitest";

import { buildNotificationPayload, parsePushPayload } from "./push-notification";

describe("parsePushPayload", () => {
  it("returns payload when json parse succeeds", () => {
    const payload = parsePushPayload({
      json: () => ({ title: "Course ready", body: "Open lesson", url: "/learn/1" }),
    });

    expect(payload).toEqual({
      title: "Course ready",
      body: "Open lesson",
      url: "/learn/1",
    });
  });

  it("falls back when json parse throws", () => {
    const payload = parsePushPayload({
      json: () => {
        throw new Error("bad payload");
      },
    });

    expect(payload).toEqual({});
  });
});

describe("buildNotificationPayload", () => {
  it("uses safe defaults when payload missing fields", () => {
    expect(buildNotificationPayload({})).toEqual({
      title: "Learnly",
      options: {
        body: "",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        data: { url: "/notifications" },
      },
    });
  });

  it("trims title and url before showing notification", () => {
    expect(
      buildNotificationPayload({
        title: "  New message  ",
        body: "Body",
        url: "  /courses  ",
      })
    ).toEqual({
      title: "New message",
      options: {
        body: "Body",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        data: { url: "/courses" },
      },
    });
  });
});
