import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    swSrc: "worker/index.ts",
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-icons",
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.cloudflare.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.learnly.app https://*.clerk.accounts.dev https://js.stripe.com https://*.posthog.com https://*.i.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: http://localhost:9000 https://*.r2.cloudflarestorage.com https://*.cloudflare.com https://img.clerk.com https://*.clerk.com https://*.clerk.dev https://lh3.googleusercontent.com https://www.gstatic.com https://ssl.gstatic.com",
              "media-src 'self' blob: http://localhost:9000 https://*.r2.cloudflarestorage.com https://*.cloudflare.com https://*.cloudflarestream.com https://videodelivery.net",
              "connect-src 'self' http://localhost:8000 https://*.clerk.accounts.dev https://api.stripe.com https://clerk.learnly.app https://clerk-telemetry.com https://*.posthog.com https://*.i.posthog.com wss: ws:",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
