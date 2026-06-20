import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { matchPrecache, precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

import { buildNotificationPayload, parsePushPayload } from "../lib/push-notification";

type StrategyConfig = {
  cacheName: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
  networkTimeoutSeconds?: number;
  rangeRequests?: boolean;
};

type RuntimeRoute = {
  handler: "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate";
  method?: "GET";
  options: StrategyConfig;
  urlPattern: RegExp | ((context: { request: Request; sameOrigin: boolean; url: URL }) => boolean);
};

type ManifestEntry = string | { revision?: string | null; url: string };

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    __WB_DISABLE_DEV_LOGS?: boolean;
    __WB_MANIFEST: ManifestEntry[];
  };

const runtimeRoutes: RuntimeRoute[] = [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: { cacheName: "google-fonts-webfonts", maxEntries: 4, maxAgeSeconds: 31536000 },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: "StaleWhileRevalidate",
    options: { cacheName: "google-fonts-stylesheets", maxEntries: 4, maxAgeSeconds: 604800 },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: "StaleWhileRevalidate",
    options: { cacheName: "static-font-assets", maxEntries: 4, maxAgeSeconds: 604800 },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(url.pathname),
    handler: "StaleWhileRevalidate",
    options: { cacheName: "static-image-assets", maxEntries: 64, maxAgeSeconds: 2592000 },
  },
  {
    urlPattern: /\/_next\/static.+\.js$/i,
    handler: "CacheFirst",
    options: { cacheName: "next-static-js-assets", maxEntries: 64, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: /\/_next\/image\?url=.+$/i,
    handler: "StaleWhileRevalidate",
    options: { cacheName: "next-image", maxEntries: 64, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(?:mp3|wav|ogg)$/i.test(url.pathname),
    handler: "CacheFirst",
    options: { cacheName: "static-audio-assets", maxEntries: 32, maxAgeSeconds: 86400, rangeRequests: true },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(?:mp4|webm)$/i.test(url.pathname),
    handler: "CacheFirst",
    options: { cacheName: "static-video-assets", maxEntries: 32, maxAgeSeconds: 86400, rangeRequests: true },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(?:js)$/i.test(url.pathname),
    handler: "StaleWhileRevalidate",
    options: { cacheName: "static-js-assets", maxEntries: 48, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && /\.(?:css|less)$/i.test(url.pathname),
    handler: "StaleWhileRevalidate",
    options: { cacheName: "static-style-assets", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
    handler: "StaleWhileRevalidate",
    options: { cacheName: "next-data", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: /\.(?:json|xml|csv)$/i,
    handler: "NetworkFirst",
    options: { cacheName: "static-data-assets", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth/callback"),
    handler: "NetworkFirst",
    method: "GET",
    options: { cacheName: "apis", maxEntries: 16, maxAgeSeconds: 86400, networkTimeoutSeconds: 10 },
  },
  {
    urlPattern: ({ request, sameOrigin, url }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !url.pathname.startsWith("/api/"),
    handler: "NetworkFirst",
    options: { cacheName: "pages-rsc-prefetch", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ request, sameOrigin, url }) =>
      request.headers.get("RSC") === "1" && sameOrigin && !url.pathname.startsWith("/api/"),
    handler: "NetworkFirst",
    options: { cacheName: "pages-rsc", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ sameOrigin, url }) => sameOrigin && !url.pathname.startsWith("/api/"),
    handler: "NetworkFirst",
    options: { cacheName: "pages", maxEntries: 32, maxAgeSeconds: 86400 },
  },
  {
    urlPattern: ({ sameOrigin }) => !sameOrigin,
    handler: "NetworkFirst",
    options: { cacheName: "cross-origin", maxEntries: 32, maxAgeSeconds: 3600, networkTimeoutSeconds: 10 },
  },
];

function createPlugins(config: StrategyConfig) {
  const plugins = [new CacheableResponsePlugin({ statuses: [0, 200] })];

  if (config.rangeRequests) {
    plugins.push(new RangeRequestsPlugin());
  }

  if (config.maxEntries !== undefined || config.maxAgeSeconds !== undefined) {
    plugins.push(
      new ExpirationPlugin({
        maxEntries: config.maxEntries,
        maxAgeSeconds: config.maxAgeSeconds,
      })
    );
  }

  return plugins;
}

function createStrategy(route: RuntimeRoute) {
  const options = {
    cacheName: route.options.cacheName,
    networkTimeoutSeconds: route.options.networkTimeoutSeconds,
    plugins: createPlugins(route.options),
  };

  switch (route.handler) {
    case "CacheFirst":
      return new CacheFirst(options);
    case "NetworkFirst":
      return new NetworkFirst(options);
    case "StaleWhileRevalidate":
      return new StaleWhileRevalidate(options);
  }
}

self.__WB_DISABLE_DEV_LOGS = true;
self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  "/",
  new NetworkFirst({
    cacheName: "start-url",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
  "GET"
);

for (const route of runtimeRoutes) {
  registerRoute(route.urlPattern, createStrategy(route), route.method);
}

setCatchHandler(async ({ event }) => {
  if (event.request.destination === "document") {
    return (await matchPrecache("/~offline")) ?? Response.error();
  }

  return Response.error();
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = parsePushPayload(event.data);
      const notification = buildNotificationPayload(payload);
      await self.registration.showNotification(notification.title, notification.options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data as { url: string }).url;
  // Only navigate within the same origin to prevent open-redirect
  let url = "/notifications";
  try {
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      url = parsed.pathname + parsed.search;
    }
  } catch {
    // malformed url — fall back to /notifications
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
