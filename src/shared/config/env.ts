import "server-only";

/**
 * Typed, validated access to server-side environment variables.
 *
 * Validation is lazy (on first access) rather than at import time so that
 * `next build` can import server modules without a full production env.
 */

const SERVER_ENV_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

export function getServerEnv(key: ServerEnvKey): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable "${key}". See .env.example.`,
    );
  }
  return value;
}

/** Validates every required server variable at once; call from a health check or startup. */
export function assertServerEnv(): void {
  const missing = SERVER_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
