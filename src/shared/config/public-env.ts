/**
 * Public (browser-safe) configuration. `NEXT_PUBLIC_*` variables are inlined
 * at build time, so they must be referenced statically (no dynamic keys).
 */

const DEFAULT_MAX_UPLOAD_MB = 100;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  maxUploadBytes:
    parsePositiveInt(
      process.env.NEXT_PUBLIC_MAX_UPLOAD_MB,
      DEFAULT_MAX_UPLOAD_MB,
    ) *
    1024 *
    1024,
} as const;
