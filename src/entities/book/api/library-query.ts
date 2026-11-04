import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import {
  books,
  readingProgress,
  shelfBooks,
  shelves,
} from "@/shared/db/schema";

import type { LibraryBook } from "../model/types";

/**
 * The user's whole library in ONE database round trip (`db.batch` sends both
 * queries in a single HTTP request; each Neon round trip costs ~100+ ms).
 *
 * Shelf and search filtering happen in the browser over this list, so switching
 * shelves needs no server request at all.
 */
export async function getLibraryBooks(userId: string): Promise<LibraryBook[]> {
  const db = getDb();

  const [rows, memberships] = await db.batch([
    db
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
      .where(eq(books.userId, userId))
      .orderBy(desc(books.createdAt)),
    // Which shelves each book is on.
    db
      .select({ bookId: shelfBooks.bookId, shelfId: shelfBooks.shelfId })
      .from(shelfBooks)
      .innerJoin(shelves, eq(shelves.id, shelfBooks.shelfId))
      .where(eq(shelves.userId, userId)),
  ]);

  const shelvesByBook = new Map<string, string[]>();
  for (const { bookId, shelfId } of memberships) {
    const list = shelvesByBook.get(bookId);
    if (list) list.push(shelfId);
    else shelvesByBook.set(bookId, [shelfId]);
  }

  return rows.map(({ coverKey, percent, ...book }) => ({
    ...book,
    hasCover: coverKey !== null,
    percent: percent === null || percent <= 0 ? null : Math.min(100, percent),
    shelfIds: shelvesByBook.get(book.id) ?? [],
  }));
}
