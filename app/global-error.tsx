"use client";

// Replaces the root layout when it fails, so it brings its own <html>, <body> and styles.
import "@/app/styles/globals.css";

export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="max-w-md text-foreground/70">
          The app hit an unexpected problem. Trying again usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
