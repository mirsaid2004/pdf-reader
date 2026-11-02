import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAMES, SIGN_IN_PATH } from "@/shared/auth/routes";

/**
 * Optimistic auth gate: redirects to sign-in when no session cookie exists.
 * It does NOT validate the session (no DB hit per request) — pages and route
 * handlers do that via `requireUser()`.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );
  if (hasSessionCookie) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const signInUrl = new URL(SIGN_IN_PATH, request.url);
  signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/library/:path*", "/read/:path*"],
};
