"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorScreenProps = {
  /** What Next passes to `error.tsx` (any thrown value). */
  error: unknown;
  retry: () => void;
  title?: string;
  description?: string;
  /** Where "go back" leads. */
  backHref?: string;
  backLabel?: string;
};

/** Friendly full-section error UI used by every `error.tsx`. */
export function ErrorScreen({
  error,
  retry,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, or head back and carry on.",
  backHref = "/library",
  backLabel = "Back to library",
}: ErrorScreenProps) {
  // Server errors arrive with a generic message and a digest that matches the server log.
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-foreground/70">{description}</p>
      {digest && (
        <p className="text-xs text-foreground/60">Reference: {digest}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href={backHref}
          className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5"
        >
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
