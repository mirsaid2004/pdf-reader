import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { auth } from "./auth";
import { SIGN_IN_PATH } from "./routes";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * Data Access Layer entry point: the verified current user, or null.
 * Reads cookies, so callers must render inside a <Suspense> boundary.
 * Deduplicated per request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Mark this as request-time before Auth.js runs: it calls
  // crypto.getRandomValues() internally, which Cache Components forbids
  // during prerendering.
  await connection();
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
});

/**
 * Authoritative auth check for protected pages, server actions, and route
 * handlers. proxy.ts only does an optimistic cookie check.
 */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const query = callbackUrl
      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "";
    redirect(`${SIGN_IN_PATH}${query}`);
  }
  return user;
}
