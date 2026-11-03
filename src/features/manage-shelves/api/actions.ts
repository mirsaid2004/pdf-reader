"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";

import { getCurrentUser } from "@/shared/auth";
import { getDb, isUniqueViolation } from "@/shared/db";
import { shelves } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

import { shelfIdSchema, shelfNameSchema } from "../model/schemas";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const DUPLICATE_NAME = "You already have a shelf with that name.";

export async function createShelf(
  name: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = shelfNameSchema.safeParse(name);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid name.");

  try {
    const [row] = await getDb()
      .insert(shelves)
      .values({ userId: user.id, name: parsed.data })
      .returning({ id: shelves.id });
    if (!row) return fail("Couldn't create the shelf.");
    refresh();
    return ok({ id: row.id });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(DUPLICATE_NAME);
    console.error("createShelf failed", error);
    return fail("Couldn't create the shelf.");
  }
}

/** System shelves can be renamed too; `kind` stays, so they keep their meaning. */
export async function renameShelf(
  shelfId: unknown,
  name: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const id = shelfIdSchema.safeParse(shelfId);
  const parsedName = shelfNameSchema.safeParse(name);
  if (!id.success) return fail("Shelf not found.");
  if (!parsedName.success)
    return fail(parsedName.error.issues[0]?.message ?? "Invalid name.");

  try {
    const updated = await getDb()
      .update(shelves)
      .set({ name: parsedName.data })
      .where(and(eq(shelves.id, id.data), eq(shelves.userId, user.id)))
      .returning({ id: shelves.id });
    if (updated.length === 0) return fail("Shelf not found.");
  } catch (error) {
    if (isUniqueViolation(error)) return fail(DUPLICATE_NAME);
    console.error("renameShelf failed", error);
    return fail("Couldn't rename the shelf.");
  }
  refresh();
  return ok(undefined);
}

/** Only custom shelves (kind IS NULL) can be deleted. Books are not deleted. */
export async function deleteShelf(shelfId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const id = shelfIdSchema.safeParse(shelfId);
  if (!id.success) return fail("Shelf not found.");

  const deleted = await getDb()
    .delete(shelves)
    .where(
      and(
        eq(shelves.id, id.data),
        eq(shelves.userId, user.id),
        isNull(shelves.kind),
      ),
    )
    .returning({ id: shelves.id });
  if (deleted.length === 0) return fail("This shelf can't be deleted.");

  refresh();
  return ok(undefined);
}
