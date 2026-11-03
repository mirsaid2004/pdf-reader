import "server-only";

import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { insertDefaultShelves } from "@/shared/db/default-shelves";
import { shelfBooks, shelves, type ShelfKind } from "@/shared/db/schema";

/**
 * Adds a book to a shelf. Status shelves (Reading / Want to read / Finished)
 * are mutually exclusive: adding to one removes the book from the others,
 * atomically (`batch` runs both statements in one transaction). Custom
 * shelves are free-form. The caller must have verified ownership of both.
 */
export async function addBookToShelf(params: {
  userId: string;
  bookId: string;
  shelf: { id: string; kind: ShelfKind | null };
}): Promise<void> {
  const { userId, bookId, shelf } = params;
  const db = getDb();

  if (!shelf.kind) {
    await db
      .insert(shelfBooks)
      .values({ shelfId: shelf.id, bookId })
      .onConflictDoNothing();
    return;
  }

  const otherStatusShelves = db
    .select({ id: shelves.id })
    .from(shelves)
    .where(
      and(
        eq(shelves.userId, userId),
        isNotNull(shelves.kind),
        ne(shelves.id, shelf.id),
      ),
    );

  await db.batch([
    db
      .delete(shelfBooks)
      .where(
        and(
          eq(shelfBooks.bookId, bookId),
          inArray(shelfBooks.shelfId, otherStatusShelves),
        ),
      ),
    db
      .insert(shelfBooks)
      .values({ shelfId: shelf.id, bookId })
      .onConflictDoNothing(),
  ]);
}

async function findStatusShelf(
  userId: string,
  kind: ShelfKind,
): Promise<string | null> {
  const lookup = () =>
    getDb()
      .select({ id: shelves.id })
      .from(shelves)
      .where(and(eq(shelves.userId, userId), eq(shelves.kind, kind)))
      .limit(1);

  const [found] = await lookup();
  if (found) return found.id;

  // Self-heal if the default shelves were never created.
  await insertDefaultShelves(getDb(), userId);
  const [created] = await lookup();
  return created?.id ?? null;
}

/**
 * Moves a book to the user's Reading / Want to read / Finished shelf.
 * `skipIfOnKind` leaves the book alone when it is already on that status
 * shelf (e.g. never pull a Finished book back to Reading).
 */
export async function moveBookToStatusShelf(params: {
  userId: string;
  bookId: string;
  kind: ShelfKind;
  skipIfOnKind?: ShelfKind;
}): Promise<void> {
  const { userId, bookId, kind, skipIfOnKind } = params;

  if (skipIfOnKind) {
    const [existing] = await getDb()
      .select({ shelfId: shelfBooks.shelfId })
      .from(shelfBooks)
      .innerJoin(shelves, eq(shelves.id, shelfBooks.shelfId))
      .where(
        and(
          eq(shelfBooks.bookId, bookId),
          eq(shelves.userId, userId),
          eq(shelves.kind, skipIfOnKind),
        ),
      )
      .limit(1);
    if (existing) return;
  }

  const shelfId = await findStatusShelf(userId, kind);
  if (shelfId)
    await addBookToShelf({ userId, bookId, shelf: { id: shelfId, kind } });
}
