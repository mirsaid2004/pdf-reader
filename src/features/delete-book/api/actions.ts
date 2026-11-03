"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";

import { bookIdSchema } from "@/entities/book";
import { getCurrentUser } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { books } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";
import { deleteObjects } from "@/shared/lib/r2";

export async function deleteBook(bookId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");

  const parsed = bookIdSchema.safeParse(bookId);
  if (!parsed.success) return fail("Book not found.");

  // DB first: if R2 cleanup then fails we only leak storage, never leave a
  // book row pointing at a missing file. Related rows cascade.
  const [deleted] = await getDb()
    .delete(books)
    .where(and(eq(books.id, parsed.data), eq(books.userId, user.id)))
    .returning({ fileKey: books.fileKey, coverKey: books.coverKey });
  if (!deleted) return fail("Book not found.");

  try {
    await deleteObjects([
      deleted.fileKey,
      ...(deleted.coverKey ? [deleted.coverKey] : []),
    ]);
  } catch (error) {
    console.error("R2 cleanup failed after deleting book", parsed.data, error);
  }

  refresh();
  return ok(undefined);
}
