// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

export type Interval = { start: number; end: number };
export type SessionSample = {
  startedAt: number;
  endedAt: number;
  pagesRead: number;
};

const DAY_MS = 86_400_000;

/** A valid IANA time zone, or "UTC" if the value is missing or unknown. */
export function resolveTimeZone(raw: string | null | undefined): string {
  if (!raw) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return "UTC";
  }
}

/** The calendar day ("YYYY-MM-DD") a moment falls on in a time zone. */
export function dayKey(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ms);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Calendar arithmetic on day keys (time-zone free). */
export function addDays(key: string, delta: number): string {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + delta * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The last `count` days ending at `todayKey`, oldest first. */
export function lastDays(todayKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    addDays(todayKey, i - (count - 1)),
  );
}

/** Total time covered by the intervals, counting overlapping stretches once (ms). */
export function totalMergedMs(intervals: Interval[]): number {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .toSorted((a, b) => a.start - b.start);
  let total = 0;
  let current: Interval | null = null;
  for (const interval of sorted) {
    if (current && interval.start <= current.end) {
      current.end = Math.max(current.end, interval.end);
    } else {
      if (current) total += current.end - current.start;
      current = { ...interval };
    }
  }
  if (current) total += current.end - current.start;
  return total;
}

/** Pages read on each of `days` (by the day a session started). */
export function pagesPerDay(
  sessions: SessionSample[],
  days: string[],
  timeZone: string,
): number[] {
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    const key = dayKey(session.startedAt, timeZone);
    byDay.set(key, (byDay.get(key) ?? 0) + session.pagesRead);
  }
  return days.map((day) => byDay.get(day) ?? 0);
}

/** Days on which any reading happened (a session touches its start and end day). */
export function activeDays(
  sessions: SessionSample[],
  timeZone: string,
): Set<string> {
  const days = new Set<string>();
  for (const session of sessions) {
    days.add(dayKey(session.startedAt, timeZone));
    days.add(dayKey(session.endedAt, timeZone));
  }
  return days;
}

/**
 * Consecutive days with reading, ending today. A streak isn't broken until
 * a whole day passes, so if you haven't read yet today it counts up to yesterday.
 */
export function currentStreak(active: Set<string>, todayKey: string): number {
  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** "0m", "12m", "3h 05m", "142h" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(ms, 0) / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours >= 100
    ? `${hours}h`
    : `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
