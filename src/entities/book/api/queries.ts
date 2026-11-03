import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { books } from "@/shared/db/schema";

import { bookIdSchema } from "../model/schemas";
import type { Book } from "../model/types";

const bookColumns = {
  id: books.id,
  title: books.title,
  author: books.author,
  pageCount: books.pageCount,
  fileSize: books.fileSize,
  hasTextLayer: books.hasTextLayer,
  coverKey: books.coverKey,
  createdAt: books.createdAt,
};

type BookRow = { coverKey: string | null } & Omit<Book, "hasCover">;

const toBook = ({ coverKey, ...rest }: BookRow): Book => ({
  ...rest,
  hasCover: coverKey !== null,
});

export async function getUserBooks(userId: string): Promise<Book[]> {
  const rows = await getDb()
    .select(bookColumns)
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(desc(books.createdAt));
  return rows.map(toBook);
}

/**
 * Ownership-checked lookup including storage keys (server use only).
 * Returns null for unknown ids, other users' books, and malformed ids.
 */
export async function getOwnedBookStorage(
  userId: string,
  bookId: string,
): Promise<{ fileKey: string; coverKey: string | null } | null> {
  if (!bookIdSchema.safeParse(bookId).success) return null;
  const [row] = await getDb()
    .select({ fileKey: books.fileKey, coverKey: books.coverKey })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  return row ?? null;
}
