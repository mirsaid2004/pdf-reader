"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadPdfjs } from "@/shared/lib/pdfjs";

import type { PageSize } from "./use-virtual-pages";

export type PdfDocumentState =
  | { status: "loading" }
  | { status: "ready"; doc: PDFDocumentProxy; firstPage: PageSize }
  | { status: "error"; message: string };

const URL_REFRESH_INTERVAL_MS = 45 * 60 * 1000;
const MIN_REFRESH_GAP_MS = 15 * 1000;

function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException") return "This PDF is password-protected.";
  if (name === "InvalidPDFException") return "This file isn't a valid PDF.";
  if (name === "MissingPDFException" || name === "ResponseException") {
    return "The book file couldn't be loaded. The link may have expired.";
  }
  return "This book couldn't be opened.";
}

/**
 * Loads a PDF by (presigned) URL using range requests, so only the parts
 * being read are downloaded. Refreshes the URL before it expires and on
 * request, swapping documents without dropping the one on screen.
 */
export function usePdfDocument(params: {
  initialUrl: string;
  /** Returns a fresh presigned URL, or null if one can't be issued. */
  fetchFreshUrl: () => Promise<string | null>;
}) {
  const { initialUrl, fetchFreshUrl } = params;
  const [source, setSource] = useState({ url: initialUrl, attempt: 0 });
  const [state, setState] = useState<PdfDocumentState>({ status: "loading" });
  const currentTask = useRef<PDFDocumentLoadingTask | null>(null);
  const lastRefresh = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let task: PDFDocumentLoadingTask | undefined;
      try {
        const pdfjs = await loadPdfjs();
        task = pdfjs.getDocument({
          url: source.url,
          // Don't download the whole file in the background; fetch ranges as pages are needed.
          disableAutoFetch: true,
          rangeChunkSize: 256 * 1024,
        });
        const doc = await task.promise;
        const first = (await doc.getPage(1)).getViewport({ scale: 1 });
        if (cancelled) {
          void task.destroy();
          return;
        }
        const previous = currentTask.current;
        currentTask.current = task;
        setState({
          status: "ready",
          doc,
          firstPage: { width: first.width, height: first.height },
        });
        // Let in-flight renders against the old document finish.
        if (previous) setTimeout(() => void previous.destroy(), 2000);
      } catch (error) {
        void task?.destroy();
        if (!cancelled) {
          const message = describeError(error);
          setState((prev) =>
            prev.status === "ready" ? prev : { status: "error", message },
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(
    () => () => {
      void currentTask.current?.destroy();
      currentTask.current = null;
    },
    [],
  );

  const refreshUrl = useCallback(
    async (options?: { force?: boolean }) => {
      const now = Date.now();
      if (!options?.force && now - lastRefresh.current < MIN_REFRESH_GAP_MS)
        return;
      lastRefresh.current = now;
      const url = await fetchFreshUrl();
      if (url) setSource((prev) => ({ url, attempt: prev.attempt + 1 }));
    },
    [fetchFreshUrl],
  );

  useEffect(() => {
    const id = setInterval(
      () => void refreshUrl({ force: true }),
      URL_REFRESH_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [refreshUrl]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    void refreshUrl({ force: true }).then(() =>
      setSource((prev) => ({ ...prev, attempt: prev.attempt + 1 })),
    );
  }, [refreshUrl]);

  return { state, refreshUrl, retry };
}
