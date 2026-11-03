import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/shared/db";
import { readingSessions, shelfBooks, shelves } from "@/shared/db/schema";

import {
  activeDays,
  currentStreak,
  dayKey,
  lastDays,
  pagesPerDay,
  resolveTimeZone,
  totalMergedMs,
} from "../lib/stats";
import type { ReadingStats } from "../model/types";

export const STATS_WINDOW_DAYS = 30;

export async function getReadingStats(
  userId: string,
  rawTimeZone: string | undefined,
): Promise<ReadingStats> {
  const timeZone = resolveTimeZone(rawTimeZone);
  const db = getDb();

  const [rows, [finished]] = await Promise.all([
    db
      .select({
        startedAt: readingSessions.startedAt,
        endedAt: readingSessions.endedAt,
        pagesRead: readingSessions.pagesRead,
      })
      .from(readingSessions)
      .where(eq(readingSessions.userId, userId)),
    // "Finished" is the shelf (what Phase 5 fills automatically), so manual moves count too.
    db
      .select({ count: sql<number>`count(distinct ${shelfBooks.bookId})::int` })
      .from(shelfBooks)
      .innerJoin(shelves, eq(shelves.id, shelfBooks.shelfId))
      .where(and(eq(shelves.userId, userId), eq(shelves.kind, "finished"))),
  ]);

  const samples = rows.map((row) => ({
    startedAt: row.startedAt.getTime(),
    endedAt: row.endedAt.getTime(),
    pagesRead: row.pagesRead,
  }));

  const today = dayKey(Date.now(), timeZone);
  const days = lastDays(today, STATS_WINDOW_DAYS);
  const pages = pagesPerDay(samples, days, timeZone);

  return {
    totalMs: totalMergedMs(
      samples.map((s) => ({ start: s.startedAt, end: s.endedAt })),
    ),
    days: days.map((date, i) => ({ date, pages: pages[i] ?? 0 })),
    streak: currentStreak(activeDays(samples, timeZone), today),
    booksFinished: finished?.count ?? 0,
    sessionCount: samples.length,
    timeZone,
  };
}
