import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      name: "Learnly",
      short_name: "Learnly",
      description: "Online learning marketplace with thousands of expert-led courses.",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#a435f0",
      orientation: "portrait-primary",
      categories: ["education"],
      lang: "en",
      icons: [
        { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
        { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
        { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
        { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
        { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/icon.svg",               sizes: "any",     type: "image/svg+xml" },
      ],
      screenshots: [
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          form_factor: "narrow",
          label: "Learnly — Learn Without Limits",
        },
      ],
      shortcuts: [
        {
          name: "My Learning",
          short_name: "Learning",
          description: "Continue your courses",
          url: "/dashboard",
          icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
        },
        {
          name: "Browse Courses",
          short_name: "Courses",
          description: "Discover new courses",
          url: "/courses",
          icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
        },
      ],
    },
    {
      headers: { "Content-Type": "application/manifest+json" },
    }
  );
}
