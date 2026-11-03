"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import type { ReaderBook } from "@/entities/book";
import { getBookReadUrl } from "@/features/read-book";

import { usePdfDocument } from "../model/use-pdf-document";
import { ReaderView } from "./reader-view";

type PdfReaderProps = {
  book: ReaderBook;
  initialUrl: string;
  initialPage: number;
};

export function PdfReader({ book, initialUrl, initialPage }: PdfReaderProps) {
  const fetchFreshUrl = useCallback(async () => {
    const result = await getBookReadUrl(book.id);
    return result.ok ? result.data.url : null;
  }, [book.id]);

  const { state, refreshUrl, retry } = usePdfDocument({
    initialUrl,
    fetchFreshUrl,
  });
  // The reader view is rebuilt when the route is hidden and shown again (see
  // usePdfDocument), so remember where the reader was.
  const [resumePage, setResumePage] = useState(initialPage);
  // A failed page render usually means the signed URL expired; fetch a new one.
  const onRenderError = useCallback(() => void refreshUrl(), [refreshUrl]);

  if (state.status === "ready") {
    return (
      <ReaderView
        book={book}
        doc={state.doc}
        firstPage={state.firstPage}
        initialPage={resumePage}
        onPageChange={setResumePage}
        onRenderError={onRenderError}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      {state.status === "loading" ? (
        <>
          <span className="size-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          <p className="text-sm text-foreground/70">Opening “{book.title}”…</p>
        </>
      ) : (
        <>
          <p role="alert" className="max-w-sm">
            {state.message}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retry}
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
        </>
      )}
    </div>
  );
}
