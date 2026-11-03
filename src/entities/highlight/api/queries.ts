import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { highlights } from "@/shared/db/schema";

import type { Highlight } from "../model/types";

export const highlightColumns = {
  id: highlights.id,
  page: highlights.page,
  rects: highlights.rects,
  text: highlights.text,
  color: highlights.color,
  note: highlights.note,
  createdAt: highlights.createdAt,
  updatedAt: highlights.updatedAt,
};

/** A book's highlights in reading order (page, then top-to-bottom, left-to-right). */
export async function getHighlights(
  userId: string,
  bookId: string,
): Promise<Highlight[]> {
  const rows = await getDb()
    .select(highlightColumns)
    .from(highlights)
    .where(and(eq(highlights.userId, userId), eq(highlights.bookId, bookId)))
    .orderBy(asc(highlights.page), asc(highlights.createdAt));

  return rows.toSorted(
    (a, b) =>
      a.page - b.page ||
      (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0) ||
      (a.rects[0]?.x ?? 0) - (b.rects[0]?.x ?? 0),
  );
}
