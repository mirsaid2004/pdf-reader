"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/shared/auth";
import { publicEnv } from "@/shared/config";
import { getDb } from "@/shared/db";
import { books } from "@/shared/db/schema";
import { type ActionResult, fail, ok } from "@/shared/lib/action-result";
import {
  bookCoverKey,
  bookPdfKey,
  headObject,
  presignPut,
  readObjectPrefix,
} from "@/shared/lib/r2";

import {
  createBookSchema,
  MAX_COVER_BYTES,
  PDF_CONTENT_TYPE,
  requestUploadSchema,
} from "../model/schemas";

export type UploadTarget = {
  bookId: string;
  pdfUrl: string;
  coverUrl: string | null;
};

/** Step 1: issue presigned PUT URLs. File bodies never pass through our server. */
export async function requestUpload(
  input: unknown,
): Promise<ActionResult<UploadTarget>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");

  const parsed = requestUploadSchema.safeParse(input);
  if (!parsed.success)
    return fail("This file can't be uploaded (invalid size or type).");
  const { fileSize, cover } = parsed.data;

  const bookId = crypto.randomUUID();
  const [pdfUrl, coverUrl] = await Promise.all([
    presignPut({
      key: bookPdfKey(user.id, bookId),
      contentType: PDF_CONTENT_TYPE,
      contentLength: fileSize,
    }),
    cover
      ? presignPut({
          key: bookCoverKey(user.id, bookId, cover.contentType),
          contentType: cover.contentType,
          contentLength: cover.size,
        })
      : null,
  ]);

  return ok({ bookId, pdfUrl, coverUrl });
}

/** Step 2: verify the uploaded objects in R2, then record the book. */
export async function createBook(
  input: unknown,
): Promise<ActionResult<{ bookId: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Please sign in again.");

  const parsed = createBookSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid book details.");
  }
  const data = parsed.data;

  // Keys are derived from the session user, so a client can't claim
  // another user's objects.
  const fileKey = bookPdfKey(user.id, data.bookId);
  const coverKeyCandidate = data.coverContentType
    ? bookCoverKey(user.id, data.bookId, data.coverContentType)
    : null;

  const [pdfHead, coverHead] = await Promise.all([
    headObject(fileKey),
    coverKeyCandidate ? headObject(coverKeyCandidate) : null,
  ]);

  if (!pdfHead) return fail("The upload didn't complete. Please try again.");
  if (pdfHead.size === 0 || pdfHead.size > publicEnv.maxUploadBytes) {
    return fail("The uploaded file has an invalid size.");
  }
  const magic = new TextDecoder().decode(await readObjectPrefix(fileKey, 5));
  if (magic !== "%PDF-") return fail("The uploaded file isn't a valid PDF.");

  // A missing/oversized cover isn't fatal: the UI falls back to a placeholder.
  const coverKey =
    coverHead && coverHead.size > 0 && coverHead.size <= MAX_COVER_BYTES
      ? coverKeyCandidate
      : null;

  try {
    await getDb().insert(books).values({
      id: data.bookId,
      userId: user.id,
      title: data.title,
      author: data.author,
      fileKey,
      coverKey,
      pageCount: data.pageCount,
      fileSize: pdfHead.size,
      hasTextLayer: data.hasTextLayer,
      outline: data.outline,
    });
  } catch (error) {
    console.error("createBook insert failed", error);
    return fail("Couldn't save the book. It may already exist.");
  }

  refresh();
  return ok({ bookId: data.bookId });
}
