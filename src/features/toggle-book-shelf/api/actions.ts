"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { addBookToShelf } from "@/entities/shelf/server";
import { getCurrentUser } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { books, shelfBooks, shelves } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

const inputSchema = z.object({
  bookId: z.uuid(),
  shelfId: z.uuid(),
  on: z.boolean(),
});

/**
 * Adds/removes a book to/from a shelf and returns the book's resulting shelf
 * ids. Status shelves (Reading / Want to read / Finished) are mutually
 * exclusive: adding to one removes the book from the others. Custom shelves
 * are free-form.
 */
export async function setBookShelf(
  input: unknown,
): Promise<ActionResult<{ shelfIds: string[] }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { bookId, shelfId, on } = parsed.data;

  const db = getDb();
  const [[shelf], [book]] = await Promise.all([
    db
      .select({ id: shelves.id, kind: shelves.kind })
      .from(shelves)
      .where(and(eq(shelves.id, shelfId), eq(shelves.userId, user.id)))
      .limit(1),
    db
      .select({ id: books.id })
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
      .limit(1),
  ]);
  if (!shelf || !book) return fail("Book or shelf not found.");

  if (!on) {
    await db
      .delete(shelfBooks)
      .where(
        and(eq(shelfBooks.bookId, bookId), eq(shelfBooks.shelfId, shelfId)),
      );
  } else {
    await addBookToShelf({ userId: user.id, bookId, shelf });
  }

  const memberships = await db
    .select({ shelfId: shelfBooks.shelfId })
    .from(shelfBooks)
    .innerJoin(shelves, eq(shelves.id, shelfBooks.shelfId))
    .where(and(eq(shelfBooks.bookId, bookId), eq(shelves.userId, user.id)));

  refresh();
  return ok({ shelfIds: memberships.map((row) => row.shelfId) });
}
