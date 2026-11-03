"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { Bookmark } from "@/entities/bookmark";
import { getReaderBook } from "@/entities/book/server";
import { getCurrentUser } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { bookmarks } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";
const MAX_LABEL_LENGTH = 200;

const bookmarkColumns = {
  id: bookmarks.id,
  page: bookmarks.page,
  label: bookmarks.label,
  createdAt: bookmarks.createdAt,
};

const toggleSchema = z.object({
  bookId: z.uuid(),
  page: z.number().int().min(1).max(100_000),
});

/**
 * Adds a bookmark on a page, or removes it if one is already there.
 * Returns the new bookmark, or `null` when it was removed.
 */
export async function toggleBookmark(
  input: unknown,
): Promise<ActionResult<{ bookmark: Bookmark | null }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { bookId, page } = parsed.data;

  const owned = await getReaderBook(user.id, bookId);
  if (!owned) return fail("Book not found.");
  if (page > owned.book.pageCount) return fail("That page doesn't exist.");

  const db = getDb();
  // The unique (user, book, page) constraint makes this safe against double clicks.
  const [created] = await db
    .insert(bookmarks)
    .values({ userId: user.id, bookId, page })
    .onConflictDoNothing()
    .returning(bookmarkColumns);
  if (created) return ok({ bookmark: created });

  await db
    .delete(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, user.id),
        eq(bookmarks.bookId, bookId),
        eq(bookmarks.page, page),
      ),
    );
  return ok({ bookmark: null });
}

const labelSchema = z.object({
  id: z.uuid(),
  label: z
    .string()
    .max(MAX_LABEL_LENGTH)
    .transform((value) => (value.trim() === "" ? null : value.trim())),
});

export async function setBookmarkLabel(
  input: unknown,
): Promise<ActionResult<{ label: string | null }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = labelSchema.safeParse(input);
  if (!parsed.success)
    return fail(`Labels can be at most ${MAX_LABEL_LENGTH} characters.`);

  const [updated] = await getDb()
    .update(bookmarks)
    .set({ label: parsed.data.label })
    .where(and(eq(bookmarks.id, parsed.data.id), eq(bookmarks.userId, user.id)))
    .returning({ label: bookmarks.label });
  return updated ? ok({ label: updated.label }) : fail("Bookmark not found.");
}

export async function deleteBookmark(id: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("Bookmark not found.");

  const deleted = await getDb()
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, parsed.data), eq(bookmarks.userId, user.id)))
    .returning({ id: bookmarks.id });
  return deleted.length > 0 ? ok(undefined) : fail("Bookmark not found.");
}
