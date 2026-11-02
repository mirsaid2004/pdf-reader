// Edge-safe route constants shared by proxy.ts, auth config, and UI.

export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_AFTER_SIGN_IN_PATH = "/library";

/** Auth.js session cookie names (the __Secure- variant is used over HTTPS). */
export const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

/**
 * Returns a safe, same-origin relative path to redirect to after sign-in.
 * Rejects absolute and protocol-relative URLs to prevent open redirects.
 */
export function sanitizeCallbackUrl(
  raw: string | string[] | undefined,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return DEFAULT_AFTER_SIGN_IN_PATH;
  }
  return value;
}
