import "server-only";

import { auth } from "@clerk/nextjs/server";

type AuthResult = Awaited<ReturnType<typeof auth>>;

const MIDDLEWARE_ERROR_FRAGMENT = "can't detect usage of clerkMiddleware()";

export async function getOptionalAuth(): Promise<AuthResult | null> {
  try {
    return await auth();
  } catch (error) {
    if (error instanceof Error && error.message.includes(MIDDLEWARE_ERROR_FRAGMENT)) {
      return null;
    }
    throw error;
  }
}
