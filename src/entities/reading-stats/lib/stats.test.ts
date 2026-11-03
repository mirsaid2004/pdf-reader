import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activeDays,
  addDays,
  currentStreak,
  dayKey,
  formatDuration,
  lastDays,
  pagesPerDay,
  resolveTimeZone,
  totalMergedMs,
} from "./stats.ts";

const at = (iso: string) => new Date(iso).getTime();

describe("resolveTimeZone", () => {
  it("accepts real zones and falls back to UTC", () => {
    assert.equal(resolveTimeZone("Asia/Tashkent"), "Asia/Tashkent");
    assert.equal(resolveTimeZone("Not/AZone"), "UTC");
    assert.equal(resolveTimeZone(undefined), "UTC");
    assert.equal(resolveTimeZone(""), "UTC");
  });
});

describe("dayKey", () => {
  it("puts a late-evening UTC moment on the next day in an eastern zone", () => {
    const moment = at("2026-03-10T20:30:00Z");
    assert.equal(dayKey(moment, "UTC"), "2026-03-10");
    assert.equal(dayKey(moment, "Asia/Tashkent"), "2026-03-11"); // UTC+5
    assert.equal(dayKey(moment, "America/Los_Angeles"), "2026-03-10");
  });
  it("handles daylight-saving transitions", () => {
    assert.equal(
      dayKey(at("2026-03-08T09:59:00Z"), "America/Los_Angeles"),
      "2026-03-08",
    );
    assert.equal(
      dayKey(at("2026-03-08T10:01:00Z"), "America/Los_Angeles"),
      "2026-03-08",
    );
  });
});

describe("addDays / lastDays", () => {
  it("crosses month and year boundaries", () => {
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(addDays("2026-01-01", -1), "2025-12-31");
    assert.equal(addDays("2024-02-28", 1), "2024-02-29"); // leap year
  });
  it("lists the window oldest first, ending today", () => {
    assert.deepEqual(lastDays("2026-03-03", 4), [
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
  });
});

describe("totalMergedMs", () => {
  it("sums separate intervals", () => {
    assert.equal(
      totalMergedMs([
        { start: 0, end: 10 },
        { start: 20, end: 25 },
      ]),
      15,
    );
  });
  it("counts overlapping stretches once", () => {
    assert.equal(
      totalMergedMs([
        { start: 0, end: 10 },
        { start: 5, end: 12 },
        { start: 11, end: 20 },
      ]),
      20,
    );
  });
  it("handles nesting, unsorted input and empty/invalid intervals", () => {
    assert.equal(
      totalMergedMs([
        { start: 5, end: 8 },
        { start: 0, end: 20 },
        { start: 30, end: 30 },
      ]),
      20,
    );
    assert.equal(totalMergedMs([]), 0);
  });
});

describe("pagesPerDay", () => {
  it("adds pages by the day a session started, in the given zone", () => {
    const sessions = [
      {
        startedAt: at("2026-03-10T20:30:00Z"),
        endedAt: at("2026-03-10T21:00:00Z"),
        pagesRead: 5,
      },
      {
        startedAt: at("2026-03-11T08:00:00Z"),
        endedAt: at("2026-03-11T08:30:00Z"),
        pagesRead: 3,
      },
    ];
    const days = ["2026-03-10", "2026-03-11", "2026-03-12"];
    assert.deepEqual(pagesPerDay(sessions, days, "UTC"), [5, 3, 0]);
    assert.deepEqual(pagesPerDay(sessions, days, "Asia/Tashkent"), [0, 8, 0]); // first one is already the 11th there
  });
});

describe("currentStreak", () => {
  const days = (...list: string[]) => new Set(list);
  it("counts consecutive days ending today", () => {
    assert.equal(
      currentStreak(
        days("2026-03-08", "2026-03-09", "2026-03-10"),
        "2026-03-10",
      ),
      3,
    );
  });
  it("is not broken until a full day is missed (today empty, yesterday read)", () => {
    assert.equal(
      currentStreak(days("2026-03-08", "2026-03-09"), "2026-03-10"),
      2,
    );
  });
  it("is 0 after a missed day and stops at gaps", () => {
    assert.equal(currentStreak(days("2026-03-07"), "2026-03-10"), 0);
    assert.equal(
      currentStreak(days("2026-03-10", "2026-03-08"), "2026-03-10"),
      1,
    );
  });
});

describe("activeDays", () => {
  it("counts both the start and end day of a session that crosses midnight", () => {
    const set = activeDays(
      [
        {
          startedAt: at("2026-03-10T23:50:00Z"),
          endedAt: at("2026-03-11T00:20:00Z"),
          pagesRead: 2,
        },
      ],
      "UTC",
    );
    assert.deepEqual([...set].sort(), ["2026-03-10", "2026-03-11"]);
  });
});

describe("formatDuration", () => {
  it("formats minutes, hours and long totals", () => {
    assert.equal(formatDuration(0), "0m");
    assert.equal(formatDuration(59_000), "0m");
    assert.equal(formatDuration(12 * 60_000), "12m");
    assert.equal(formatDuration(3 * 3_600_000 + 5 * 60_000), "3h 05m");
    assert.equal(formatDuration(142 * 3_600_000 + 59 * 60_000), "142h");
    assert.equal(formatDuration(-5), "0m");
  });
});
