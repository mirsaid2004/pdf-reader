import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getReaderBook } from "@/entities/book/server";
import { percentForPage } from "@/entities/reading-progress";
import { moveBookToStatusShelf } from "@/entities/shelf/server";
import { getDb } from "@/shared/db";
import { readingProgress, readingSessions } from "@/shared/db/schema";

import type { ReadingReportInput } from "../model/schemas";
import { MIN_SESSION_MS } from "../model/tracker";

/** Allowed clock difference between the browser and the server. */
const CLOCK_SKEW_MS = 60_000;

type SaveResult = "saved" | "not-found";

export async function saveReadingReport(params: {
  userId: string;
  bookId: string;
  report: ReadingReportInput;
}): Promise<SaveResult> {
  const { userId, bookId, report } = params;

  // Ownership check + the real page count (never trust the browser for it).
  const owned = await getReaderBook(userId, bookId);
  if (!owned) return "not-found";
  const { pageCount } = owned.book;

  const work: Promise<unknown>[] = [];
  if (report.page !== undefined) {
    work.push(saveProgress({ userId, bookId, pageCount, page: report.page }));
  }
  if (report.session) {
    work.push(
      saveSession({ userId, bookId, pageCount, session: report.session }),
    );
  }
  await Promise.all(work);

  // The library's progress bars read this; refresh them.
  if (report.page !== undefined) revalidatePath("/library");
  return "saved";
}

async function saveProgress(params: {
  userId: string;
  bookId: string;
  pageCount: number;
  page: number;
}) {
  const { userId, bookId, pageCount } = params;
  const page = Math.min(params.page, pageCount);
  const db = getDb();

  const [previous] = await db
    .select({ page: readingProgress.currentPage })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, userId),
        eq(readingProgress.bookId, bookId),
      ),
    )
    .limit(1);

  await db
    .insert(readingProgress)
    .values({
      userId,
      bookId,
      currentPage: page,
      percent: percentForPage(page, pageCount),
    })
    .onConflictDoUpdate({
      target: [readingProgress.userId, readingProgress.bookId],
      set: {
        currentPage: page,
        percent: percentForPage(page, pageCount),
        updatedAt: new Date(),
      },
    });

  // Automatic shelving. Only on transitions, so a book the reader moved by
  // hand isn't yanked back, and a Finished book re-opened stays Finished.
  const reachedEnd = page === pageCount && previous?.page !== pageCount;
  const startedReading = previous === undefined && page > 1;
  if (reachedEnd) {
    await moveBookToStatusShelf({ userId, bookId, kind: "finished" });
  } else if (startedReading) {
    await moveBookToStatusShelf({
      userId,
      bookId,
      kind: "reading",
      skipIfOnKind: "finished",
    });
  }
}

async function saveSession(params: {
  userId: string;
  bookId: string;
  pageCount: number;
  session: NonNullable<ReadingReportInput["session"]>;
}) {
  const { userId, bookId, pageCount, session } = params;
  const now = Date.now();

  // Clamp client-supplied times: never in the future, never inverted.
  const endedAt = Math.min(session.endedAt, now);
  const startedAt = Math.min(session.startedAt, endedAt);
  if (
    session.startedAt > now + CLOCK_SKEW_MS ||
    endedAt - startedAt < MIN_SESSION_MS
  )
    return;

  const pagesRead = Math.min(session.pagesRead, pageCount);

  await getDb()
    .insert(readingSessions)
    .values({
      id: session.id,
      userId,
      bookId,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      pagesRead,
    })
    .onConflictDoUpdate({
      target: readingSessions.id,
      // Only ever grow (reports can arrive out of order), and only for the
      // session's own user and book (a guessed id can't touch anyone else's).
      set: {
        endedAt: sql`greatest(${readingSessions.endedAt}, excluded.ended_at)`,
        pagesRead: sql`greatest(${readingSessions.pagesRead}, excluded.pages_read)`,
      },
      setWhere: and(
        eq(readingSessions.userId, userId),
        eq(readingSessions.bookId, bookId),
      ),
    });
}
