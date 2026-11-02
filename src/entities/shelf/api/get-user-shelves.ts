import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { insertDefaultShelves } from "@/shared/db/default-shelves";
import { DEFAULT_SHELVES, shelves } from "@/shared/db/schema";

import type { Shelf } from "../model/types";

async function selectShelves(userId: string): Promise<Shelf[]> {
  return (
    getDb()
      .select({ id: shelves.id, name: shelves.name, kind: shelves.kind })
      .from(shelves)
      .where(eq(shelves.userId, userId))
      // System shelves first (in enum order), then custom shelves by creation.
      .orderBy(sql`${shelves.kind} asc nulls last`, asc(shelves.createdAt))
  );
}

/**
 * Lists a user's shelves. Self-heals if default shelves are missing
 * (e.g. the createUser event failed after the user row was inserted).
 */
export async function getUserShelves(userId: string): Promise<Shelf[]> {
  const rows = await selectShelves(userId);
  const systemCount = rows.filter((shelf) => shelf.kind !== null).length;
  if (systemCount >= DEFAULT_SHELVES.length) return rows;

  await insertDefaultShelves(getDb(), userId);
  return selectShelves(userId);
}
