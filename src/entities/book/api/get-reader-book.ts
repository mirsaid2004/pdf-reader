import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { books } from "@/shared/db/schema";

import { bookIdSchema } from "../model/schemas";
import type { ReaderBook } from "../model/types";

/**
 * Ownership-checked lookup for the reader. Returns null for unknown ids,
 * other users' books, and malformed ids (so callers 404 without leaking).
 */
export async function getReaderBook(
  userId: string,
  bookId: string,
): Promise<{ book: ReaderBook; fileKey: string } | null> {
  if (!bookIdSchema.safeParse(bookId).success) return null;
  const [row] = await getDb()
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      pageCount: books.pageCount,
      hasTextLayer: books.hasTextLayer,
      fileKey: books.fileKey,
    })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  if (!row) return null;
  const { fileKey, ...book } = row;
  return { book, fileKey };
}
