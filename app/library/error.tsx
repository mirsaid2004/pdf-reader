"use client";

import { ErrorScreen } from "@/shared/ui/error-screen";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      retry={retry}
      title="Couldn’t load your library"
      description="Your books are safe. This is usually a temporary problem, so try again in a moment."
      backHref="/"
      backLabel="Go home"
    />
  );
}
