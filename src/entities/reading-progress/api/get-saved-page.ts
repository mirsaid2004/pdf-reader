import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { readingProgress } from "@/shared/db/schema";

/** The page the user last saved for a book, or null if they never read it. */
export async function getSavedPage(
  userId: string,
  bookId: string,
): Promise<number | null> {
  const [row] = await getDb()
    .select({ page: readingProgress.currentPage })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId),
      ),
    )
    .limit(1);
  return row?.page ?? null;
}
