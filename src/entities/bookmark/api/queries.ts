import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { bookmarks } from "@/shared/db/schema";

import type { Bookmark } from "../model/types";

export async function getBookmarks(
  userId: string,
  bookId: string,
): Promise<Bookmark[]> {
  return getDb()
    .select({
      id: bookmarks.id,
      page: bookmarks.page,
      label: bookmarks.label,
      createdAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.bookId, bookId)))
    .orderBy(asc(bookmarks.page));
}
