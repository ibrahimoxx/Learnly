export interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

export interface PushJsonData {
  json(): unknown;
}

const DEFAULT_TITLE = "Learnly";
const DEFAULT_URL = "/notifications";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parsePushPayload(data?: PushJsonData | null): PushPayload {
  if (!data) return {};

  try {
    const value = data.json();
    if (!value || typeof value !== "object") return {};

    const payload = value as Record<string, unknown>;
    return {
      title: readString(payload.title),
      body: readString(payload.body),
      url: readString(payload.url),
    };
  } catch {
    return {};
  }
}

export function buildNotificationPayload(payload: PushPayload) {
  return {
    title: payload.title?.trim() || DEFAULT_TITLE,
    options: {
      body: payload.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      data: { url: payload.url?.trim() || DEFAULT_URL },
    } satisfies NotificationOptions,
  };
}
