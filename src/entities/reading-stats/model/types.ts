export type ReadingStats = {
  /** Total reading time in ms, overlapping sessions counted once. */
  totalMs: number;
  /** The last 30 days, oldest first. */
  days: { date: string; pages: number }[];
  streak: number;
  booksFinished: number;
  sessionCount: number;
  timeZone: string;
};
