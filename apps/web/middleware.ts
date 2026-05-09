import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/courses(.*)",
  "/orgs(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

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

  if (!isPublicRoute(request)) {
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
