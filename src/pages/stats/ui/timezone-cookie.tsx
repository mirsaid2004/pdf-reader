"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Stats group reading into calendar days, which depend on where you are.
 * Remembers the browser's time zone in a cookie so the server can use it
 * (and refreshes once when it differs from what the server assumed).
 */
export function TimezoneCookie({ serverTimeZone }: { serverTimeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === serverTimeZone) return;
    document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [serverTimeZone, router]);

  return null;
}
