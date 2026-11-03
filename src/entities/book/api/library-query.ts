import "server-only";

import { and, desc, eq, exists, ilike, or, sql } from "drizzle-orm";

import { getDb } from "@/shared/db";
import {
  books,
  readingProgress,
  shelfBooks,
  shelves,
} from "@/shared/db/schema";

import type { LibraryBook } from "../model/types";

/** Escapes LIKE wildcards so user input is matched literally. */
const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

export async function countUserBooks(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(books)
    .where(eq(books.userId, userId));
  return row?.count ?? 0;
}

/**
 * The library view: the user's books, optionally limited to one shelf and/or
 * matching a title/author search (case-insensitive substring).
 * `shelfId` must already be verified as belonging to `userId`.
 */
export async function getLibraryBooks(params: {
  userId: string;
  shelfId: string | null;
  q: string;
}): Promise<LibraryBook[]> {
  const { userId, shelfId, q } = params;
  const db = getDb();

  const pattern = q ? `%${escapeLike(q)}%` : null;
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      pageCount: books.pageCount,
      fileSize: books.fileSize,
      hasTextLayer: books.hasTextLayer,
      coverKey: books.coverKey,
      createdAt: books.createdAt,
      percent: readingProgress.percent,
    })
    .from(books)
    .leftJoin(
      readingProgress,
      and(
        eq(readingProgress.bookId, books.id),
        eq(readingProgress.userId, userId),
      ),
    )
    .where(
      and(
        eq(books.userId, userId),
        pattern
          ? or(ilike(books.title, pattern), ilike(books.author, pattern))
          : undefined,
        shelfId
          ? exists(
              db
                .select({ one: sql`1` })
                .from(shelfBooks)
                .where(
                  and(
                    eq(shelfBooks.bookId, books.id),
                    eq(shelfBooks.shelfId, shelfId),
                  ),
                ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(books.createdAt));

  if (rows.length === 0) return [];

  // Which shelves each book is on (for the per-book "Shelves" menu).
  const memberships = await db
    .select({ bookId: shelfBooks.bookId, shelfId: shelfBooks.shelfId })
    .from(shelfBooks)
    .innerJoin(shelves, eq(shelves.id, shelfBooks.shelfId))
    .where(eq(shelves.userId, userId));

  const shelvesByBook = new Map<string, string[]>();
  for (const { bookId, shelfId: id } of memberships) {
    const list = shelvesByBook.get(bookId);
    if (list) list.push(id);
    else shelvesByBook.set(bookId, [id]);
  }

  return rows.map(({ coverKey, percent, ...book }) => ({
    ...book,
    hasCover: coverKey !== null,
    percent: percent === null || percent <= 0 ? null : Math.min(100, percent),
    shelfIds: shelvesByBook.get(book.id) ?? [],
  }));
}
