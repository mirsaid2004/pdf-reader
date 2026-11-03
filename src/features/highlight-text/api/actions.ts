"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  highlightColorSchema,
  highlightPartSchema,
  noteSchema,
  type Highlight,
} from "@/entities/highlight";
import { getReaderBook } from "@/entities/book/server";
import { highlightColumns } from "@/entities/highlight/server";
import { getCurrentUser } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { highlights } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

const createSchema = z.object({
  bookId: z.uuid(),
  color: highlightColorSchema,
  note: noteSchema.optional(),
  /** One part per page the selection touched. */
  parts: z.array(highlightPartSchema).min(1).max(30),
});

/** Saves a highlight (one row per page of the selection). A note goes on the first part. */
export async function createHighlights(
  input: unknown,
): Promise<ActionResult<{ highlights: Highlight[] }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("That selection can't be highlighted.");
  const { bookId, color, note, parts } = parsed.data;

  const owned = await getReaderBook(user.id, bookId);
  if (!owned) return fail("Book not found.");
  if (parts.some((part) => part.page > owned.book.pageCount))
    return fail("That page doesn't exist.");

  const created = await getDb()
    .insert(highlights)
    .values(
      parts.map((part, index) => ({
        userId: user.id,
        bookId,
        page: part.page,
        rects: part.rects,
        text: part.text,
        color,
        note: index === 0 ? (note ?? null) : null,
      })),
    )
    .returning(highlightColumns);

  revalidatePath("/books/[bookId]/highlights", "page");
  return ok({ highlights: created });
}

const updateSchema = z.object({
  id: z.uuid(),
  color: highlightColorSchema.optional(),
  /** `null` or empty clears the note. */
  note: z.union([noteSchema, z.null()]).optional(),
});

export async function updateHighlight(
  input: unknown,
): Promise<ActionResult<{ highlight: Highlight }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success)
    return fail("Invalid change (notes can be at most 5,000 characters).");
  const { id, color, note } = parsed.data;

  const [updated] = await getDb()
    .update(highlights)
    .set({
      ...(color !== undefined && { color }),
      ...(note !== undefined && { note }),
      updatedAt: new Date(),
    })
    .where(and(eq(highlights.id, id), eq(highlights.userId, user.id)))
    .returning(highlightColumns);
  if (!updated) return fail("Highlight not found.");

  revalidatePath("/books/[bookId]/highlights", "page");
  return ok({ highlight: updated });
}

export async function deleteHighlight(id: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail(SESSION_EXPIRED);

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("Highlight not found.");

  const deleted = await getDb()
    .delete(highlights)
    .where(and(eq(highlights.id, parsed.data), eq(highlights.userId, user.id)))
    .returning({ id: highlights.id });
  if (deleted.length === 0) return fail("Highlight not found.");

  revalidatePath("/books/[bookId]/highlights", "page");
  return ok(undefined);
}
