import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const publicRoutes = [
  "/",
  "/cart(.*)",
  "/courses(.*)",
  "/orgs(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/account-suspended",
  "/api/webhooks(.*)",
  "/offline",
  "/sw.js",
  "/manifest.json",
  "/icons(.*)",
  "/swe-worker(.*)",
  // Public marketing/informational pages — visible without login
  "/about",
  "/blog(.*)",
  "/careers",
  "/cookies",
  "/help(.*)",
  "/paths(.*)",
  "/pricing",
  "/privacy",
  "/teach(.*)",
  "/terms",
  "/topic(.*)",
];

// Public instructor profile page (/user/[id]) — excludes /user/edit-profile/*
// which is a separate, private route under the (student) group.
const isPublicUserProfile = (pathname: string) =>
  pathname.startsWith("/user/") && !pathname.startsWith("/user/edit-profile");

const isPublicRoute = createRouteMatcher(publicRoutes);

function getSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("host") ?? "";
  // Strip port
  const hostname = host.split(":")[0]!;

  // Local: acme.localhost → subdomain = acme
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(/\.localhost$/, "");
    return sub && sub !== "www" ? sub : null;
  }

  // Production: acme.skillforge.app → subdomain = acme
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const sub = parts[0]!;
    return sub && sub !== "www" ? sub : null;
  }

  return null;
}

export default clerkMiddleware(async (auth, request) => {
  const subdomain = getSubdomain(request);

  if (subdomain) {
    // Rewrite subdomain to /orgs/[slug] without changing the visible URL
    const url = request.nextUrl.clone();
    const existing = url.pathname;
    url.pathname = `/orgs/${subdomain}${existing === "/" ? "" : existing}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-org-slug", subdomain);
    return response;
  }

  const { sessionClaims } = await auth();
  const publicMetadata = sessionClaims?.public_metadata as { suspended?: boolean } | undefined;
  const isSuspended = publicMetadata?.suspended === true;

  if (isSuspended && request.nextUrl.pathname !== "/account-suspended") {
    return NextResponse.redirect(new URL("/account-suspended", request.url));
  }

  if (!isPublicRoute(request) && !isPublicUserProfile(request.nextUrl.pathname)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
