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
      title="Couldn’t open this book"
      description="The book is still in your library, and your place in it is saved."
    />
  );
}
