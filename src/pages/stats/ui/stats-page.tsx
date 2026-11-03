import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { formatDuration } from "@/entities/reading-stats/lib/stats";
import { getReadingStats } from "@/entities/reading-stats/server";
import { requireUser } from "@/shared/auth";
import { PagesPerDayChart } from "@/widgets/pages-per-day-chart";

import { StatsSkeleton } from "./stats-skeleton";
import { TimezoneCookie } from "./timezone-cookie";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-foreground/10 p-4">
      <dt className="text-sm text-foreground/60">{label}</dt>
      <dd className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
      {hint && <p className="text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}

async function StatsContent() {
  const user = await requireUser("/stats");
  const stats = await getReadingStats(
    user.id,
    (await cookies()).get("tz")?.value,
  );
  const pagesLast30 = stats.days.reduce((sum, day) => sum + day.pages, 0);

  return (
    <>
      <TimezoneCookie serverTimeZone={stats.timeZone} />
      {stats.sessionCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
          <p className="text-lg font-medium">No reading recorded yet</p>
          <p className="max-w-sm text-sm text-foreground/60">
            Open a book and read for a few seconds, and your time, pages and
            streak show up here.
          </p>
          <Link
            href="/library"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Go to your library
          </Link>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total reading time"
              value={formatDuration(stats.totalMs)}
              hint="Counted from your activity"
            />
            <StatTile
              label="Pages, last 30 days"
              value={pagesLast30.toLocaleString()}
            />
            <StatTile
              label="Current streak"
              value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
              hint={stats.streak === 0 ? "Read today to start one" : undefined}
            />
            <StatTile
              label="Books finished"
              value={String(stats.booksFinished)}
            />
          </dl>
          <PagesPerDayChart days={stats.days} />
          <p className="text-xs text-foreground/60">
            Days are in your time zone ({stats.timeZone}).
          </p>
        </>
      )}
    </>
  );
}

export function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Reading stats</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsContent />
      </Suspense>
    </main>
  );
}
