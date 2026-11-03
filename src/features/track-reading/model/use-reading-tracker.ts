"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { sendReadingReport } from "../lib/send-report";
import { ReadingTracker } from "./tracker";

/**
 * Saves reading progress and records reading sessions for a book.
 *
 * Activity = wheel, keys, taps, clicks. Scroll events are deliberately NOT
 * used: the reader scrolls programmatically (restoring your place), which
 * would otherwise look like reading.
 */
export function useReadingTracker(params: {
  bookId: string;
  /** The page the reader opened on (read once). */
  initialPage: number;
  currentPage: number;
}) {
  const { bookId, currentPage } = params;
  const router = useRouter();
  const initialPage = useRef(params.initialPage);
  const tracker = useRef<ReadingTracker | null>(null);

  useEffect(() => {
    const instance = new ReadingTracker({
      initialPage: initialPage.current,
      send: (report) => sendReadingReport(bookId, report),
      newId: () => crypto.randomUUID(),
    });
    tracker.current = instance;

    const onActivity = () => instance.activity();
    const onHidden = () => {
      if (document.visibilityState === "hidden") void instance.flush();
    };
    const onPageHide = () => void instance.flush();

    const activityEvents = [
      "wheel",
      "keydown",
      "pointerdown",
      "touchstart",
    ] as const;
    for (const name of activityEvents) {
      window.addEventListener(name, onActivity, {
        passive: true,
        capture: true,
      });
    }
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      for (const name of activityEvents) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      // Also runs when the route is hidden (see usePdfDocument): final flush.
      // After the final save, refresh once: the library and stats are kept in the
      // browser's cache, and this makes them show what was just read.
      void instance.dispose().then((saved) => {
        if (saved) router.refresh();
      });
      tracker.current = null;
    };
  }, [bookId, router]);

  useEffect(() => {
    tracker.current?.pageChanged(currentPage);
  }, [currentPage]);
}
