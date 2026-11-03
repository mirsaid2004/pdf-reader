"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Stale-while-revalidate for server-rendered pages kept in the browser's
 * client cache (see `staleTimes` in next.config.ts): the cached page shows
 * instantly, and if it was rendered more than `maxAgeMs` ago it is quietly
 * refreshed in place, with no loading state.
 *
 * `renderedAt` is `Date.now()` taken on the server while rendering. It runs
 * as an effect, so it also re-checks when a hidden route is shown again.
 */
export function RefreshWhenStale({
  renderedAt,
  maxAgeMs = 15_000,
}: {
  renderedAt: number;
  maxAgeMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (Date.now() - renderedAt > maxAgeMs) router.refresh();
  }, [renderedAt, maxAgeMs, router]);

  return null;
}
