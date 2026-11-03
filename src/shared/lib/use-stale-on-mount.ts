"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * For pages that take server data as *initial* state and must never start from
 * an old copy (e.g. the reader's saved page): true when this component just
 * mounted with props rendered more than `maxAgeMs` earlier (a copy from the
 * client cache). It triggers a refresh; render a skeleton until it turns false.
 *
 * Compares against the mount time instead of "now", so a component that stays
 * mounted (a hidden route shown again) is never treated as stale.
 */
export function useStaleOnMount(renderedAt: number, maxAgeMs: number): boolean {
  const router = useRouter();
  const [mountedAt] = useState(() => Date.now());
  const stale = renderedAt < mountedAt - maxAgeMs;

  useEffect(() => {
    if (stale) router.refresh();
  }, [stale, router]);

  return stale;
}
