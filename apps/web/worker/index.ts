declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  const data = (event.data?.json() as PushPayload) ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Learnly", {
      body: data.body ?? "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url ?? "/notifications" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url: string }).url;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
