import "server-only";

import { presignGet } from "@/shared/lib/r2";

/** Long enough for a reading session; the client refreshes it before expiry. */
export const READ_URL_TTL_SECONDS = 60 * 60;

export const createReadUrl = (fileKey: string): Promise<string> =>
  presignGet({ key: fileKey, expiresInSeconds: READ_URL_TTL_SECONDS });
