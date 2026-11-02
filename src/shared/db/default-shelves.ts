import "server-only";

import type { Database } from "./client";
import { DEFAULT_SHELVES, shelves } from "./schema";

/** Idempotently creates the system shelves for a user. */
export async function insertDefaultShelves(
  db: Database,
  userId: string,
): Promise<void> {
  await db
    .insert(shelves)
    .values(DEFAULT_SHELVES.map((shelf) => ({ ...shelf, userId })))
    .onConflictDoNothing();
}
