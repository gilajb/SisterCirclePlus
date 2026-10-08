"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, removeToken } from "@/lib/auth";

const subscribe = (onChange) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * Renders its children only once a valid, unexpired access token is confirmed
 * in the browser; otherwise clears the tokens and redirects to /signup.
 * UI gating only — the backend validates the real JWT on every request.
 */
export function AuthGuard({ children }) {
  const router = useRouter();
  // Both are false on the server and for the hydration render, so nothing
  // protected is rendered — and no redirect fires — before localStorage is read.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const allowed = useSyncExternalStore(subscribe, isLoggedIn, () => false);

  useEffect(() => {
    if (hydrated && !allowed) {
      removeToken();
      router.replace("/signup");
    }
  }, [hydrated, allowed, router]);

  if (!allowed) return null;
  return children;
}
