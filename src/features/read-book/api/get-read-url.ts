"use server";

import { getOwnedBookStorage } from "@/entities/book/server";
import { getCurrentUser } from "@/shared/auth";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";

import { createReadUrl } from "./read-url";

/** Issues a fresh presigned GET URL after an ownership check. */
export async function getBookReadUrl(
  bookId: unknown,
): Promise<ActionResult<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");
  if (typeof bookId !== "string") return fail("Book not found.");

  const storage = await getOwnedBookStorage(user.id, bookId);
  if (!storage) return fail("Book not found.");

  return ok({ url: await createReadUrl(storage.fileKey) });
}
