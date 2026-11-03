type Day = { date: string; pages: number };

const WEEKDAY_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
// Day keys are calendar dates, so format them as UTC to avoid shifting them.
const asDate = (key: string) => new Date(`${key}T00:00:00Z`);

/** A round axis top and gridline values (at most 4 intervals). */
function niceScale(max: number): { top: number; ticks: number[] } {
  const steps = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1_000, 2_000, 5_000, 10_000,
  ];
  const step =
    steps.find((candidate) => Math.ceil(Math.max(max, 1) / candidate) <= 4) ??
    20_000;
  const intervals = Math.max(Math.ceil(max / step), 1);
  return {
    top: intervals * step,
    ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step),
  };
}

/**
 * Pages read per day: one series, so one colour and no legend (the title names
 * it). Thin bars with a rounded top and a square baseline, a quiet grid, the
 * peak labelled at its tip, a tooltip per day (hover or keyboard focus), and a
 * table view for everything else. Server-rendered, no JavaScript.
 */
export function PagesPerDayChart({ days }: { days: Day[] }) {
  const max = Math.max(0, ...days.map((day) => day.pages));
  const { top, ticks } = niceScale(max);
  const peakIndex = max > 0 ? days.findIndex((day) => day.pages === max) : -1;
  const last = days.length - 1;

  return (
    <figure className="viz-root rounded-2xl border border-foreground/10 bg-(--viz-surface) p-4 text-(--viz-text-secondary)">
      <figcaption className="mb-4 text-sm font-medium text-(--viz-text-primary)">
        Pages read per day · last {days.length} days
      </figcaption>

      <div className="grid grid-cols-[2rem_1fr] gap-x-2">
        {/* Y axis */}
        <div className="relative h-44" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 text-xs tabular-nums"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative h-44">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-(--viz-grid)"
              style={{ bottom: `${(tick / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <ul
            className="absolute inset-0 flex gap-[2px]"
            aria-label="Pages read per day"
          >
            {days.map((day, index) => {
              const percent = (day.pages / top) * 100;
              const label = `${WEEKDAY_DATE.format(asDate(day.date))}: ${day.pages} ${day.pages === 1 ? "page" : "pages"}`;
              const tooltipSide =
                index === 0
                  ? "left-0"
                  : index === last
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2";
              return (
                // The whole column is the hit target (bigger than the bar).
                <li
                  key={day.date}
                  tabIndex={0}
                  aria-label={label}
                  className="group relative flex min-w-0 flex-1 items-end justify-center outline-none"
                >
                  {day.pages > 0 && (
                    <span
                      className="block w-full max-w-6 rounded-t-[4px] bg-(--viz-series-1) group-hover:brightness-110 group-focus-visible:brightness-110"
                      style={{ height: `${percent}%`, minHeight: 3 }}
                    />
                  )}
                  {index === peakIndex && (
                    <span
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-medium text-(--viz-text-primary) tabular-nums"
                      style={{ bottom: `calc(${percent}% + 4px)` }}
                    >
                      {day.pages}
                    </span>
                  )}
                  <span
                    role="tooltip"
                    className={`pointer-events-none absolute z-10 hidden rounded-lg border border-foreground/15 bg-(--viz-surface) px-2 py-1 text-xs whitespace-nowrap text-(--viz-text-primary) shadow-md group-hover:block group-focus-visible:block ${tooltipSide}`}
                    style={{
                      bottom: `calc(${percent}% + ${index === peakIndex ? 26 : 10}px)`,
                    }}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* X axis: a label every 7 days, counting back from today */}
        <div />
        <div className="mt-1.5 flex gap-[2px] text-xs" aria-hidden>
          {days.map((day, index) => (
            <div key={day.date} className="relative h-4 min-w-0 flex-1">
              {(last - index) % 7 === 0 && (
                <span
                  className={`absolute top-0 whitespace-nowrap ${index === 0 ? "left-0" : index === last ? "right-0" : "left-1/2 -translate-x-1/2"}`}
                >
                  {index === last
                    ? "Today"
                    : SHORT_DATE.format(asDate(day.date))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs underline underline-offset-2">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">Pages read per day</caption>
          <thead>
            <tr className="border-b border-(--viz-grid)">
              <th scope="col" className="py-1 font-medium">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Pages
              </th>
            </tr>
          </thead>
          <tbody>
            {days.toReversed().map((day) => (
              <tr key={day.date} className="border-b border-(--viz-grid)">
                <th scope="row" className="py-1 font-normal">
                  {WEEKDAY_DATE.format(asDate(day.date))}
                </th>
                <td className="py-1 text-right tabular-nums">{day.pages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
