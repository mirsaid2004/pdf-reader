"use client";

import { catchError, type ErrorInfo } from "next/error";
import Link from "next/link";

/**
 * Catches render errors inside the viewer and shows the message inside the
 * reader's own full-screen frame (the page and your place in the book are
 * untouched). `retry()` re-renders without losing state outside the boundary.
 */
export const ReaderErrorBoundary = catchError(function ReaderErrorFallback(
  props: { title: string },
  { retry }: ErrorInfo,
) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
    >
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <p className="max-w-sm text-sm text-foreground/70">
        Something went wrong while showing the pages. Your place in the book is
        saved.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
        <Link
          href="/library"
          className="rounded-lg border border-foreground/15 px-4 py-2 text-sm"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
});
