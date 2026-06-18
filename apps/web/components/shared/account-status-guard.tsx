"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";

const CHECK_INTERVAL_MS = 60_000;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function AccountStatusGuard() {
  const { isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const checking = useRef(false);

  useEffect(() => {
    if (!isSignedIn) return;

    async function checkStatus() {
      if (checking.current) return;
      checking.current = true;
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          signOut(() => router.push("/account-suspended"));
        }
      } catch {
        // Network error — transient, don't sign the user out.
      } finally {
        checking.current = false;
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken, signOut, router]);

  return null;
}
