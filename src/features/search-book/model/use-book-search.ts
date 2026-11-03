"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { foldQuery, MIN_QUERY_LENGTH } from "../lib/fold";
import {
  BookTextIndex,
  EMPTY_RESULTS,
  type SearchHit,
} from "./book-text-index";
import { SearchIndexStore } from "./index-store";
import { indexPages } from "./indexer";

export type IndexStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "indexing"; done: number; total: number }
  | { kind: "paused"; done: number; total: number }
  | { kind: "ready" }
  | { kind: "error" };

/** What the page views need to draw search highlights. */
export type SearchHighlight = {
  /** Folded query. */
  query: string;
  activePage: number | null;
  activeOrdinal: number | null;
  /** Changes on every navigation, so re-clicking the same hit scrolls again. */
  focusToken: number;
};

const FLUSH_EVERY_PAGES = 25;
const UI_UPDATE_MS = 400;

type Params = {
  bookId: string;
  doc: PDFDocumentProxy;
  pageCount: number;
  currentPage: number;
  enabled: boolean;
  /** Jump the reader to a page. */
  onGoToPage: (page: number) => void;
};

/**
 * In-book search. Page text is read with pdf.js on first use (nearest pages
 * first), cached in IndexedDB, and searched in memory. Results update while
 * indexing is still running.
 */
export function useBookSearch({
  bookId,
  doc,
  pageCount,
  currentPage,
  enabled,
  onGoToPage,
}: Params) {
  const [index] = useState(() => new BookTextIndex());
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<IndexStatus>({ kind: "idle" });
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const controller = useRef<AbortController | null>(null);
  const started = useRef(false);
  const store = useRef<SearchIndexStore | null>(null);
  const uiTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const run = useCallback(async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const { signal } = abort;

    setStatus({ kind: "loading" });
    store.current ??= await SearchIndexStore.open();
    const cache = store.current;

    try {
      const cached = await cache?.load(bookId);
      cached?.forEach((text, page) => index.addPage(page, text));
    } catch {
      // a broken cache just means we re-read the book
    }
    if (signal.aborted) return;
    setVersion((v) => v + 1);

    const missing = Array.from({ length: pageCount }, (_, i) => i + 1)
      .filter((page) => !index.has(page))
      // Nearest to where the reader is first.
      .sort(
        (a, b) =>
          Math.abs(a - currentPageRef.current) -
            Math.abs(b - currentPageRef.current) || a - b,
      );
    if (missing.length === 0) {
      setStatus({ kind: "ready" });
      return;
    }

    const buffer: { page: number; text: string }[] = [];
    const flush = async () => {
      if (!cache || buffer.length === 0) return;
      const batch = buffer.splice(0);
      try {
        await cache.save(bookId, batch);
      } catch {
        // caching is best-effort
      }
    };
    const refreshUi = () => {
      if (uiTimer.current) return;
      uiTimer.current = setTimeout(() => {
        uiTimer.current = undefined;
        setVersion((v) => v + 1);
        setStatus({ kind: "indexing", done: index.size, total: pageCount });
      }, UI_UPDATE_MS);
    };

    setStatus({ kind: "indexing", done: index.size, total: pageCount });
    try {
      await indexPages({
        doc,
        pages: missing,
        signal,
        onPage: (page, text) => {
          index.addPage(page, text);
          buffer.push({ page, text });
          if (buffer.length >= FLUSH_EVERY_PAGES) void flush();
          refreshUi();
        },
      });
    } catch {
      // The document went away (reader closed/hidden) or a page failed to parse.
      if (!signal.aborted) {
        await flush();
        setVersion((v) => v + 1);
        setStatus({ kind: "error" });
      }
      return;
    }

    await flush();
    clearTimeout(uiTimer.current);
    uiTimer.current = undefined;
    setVersion((v) => v + 1);
    setStatus(
      signal.aborted
        ? { kind: "paused", done: index.size, total: pageCount }
        : { kind: "ready" },
    );
  }, [bookId, doc, index, pageCount]);

  /** Starts indexing the first time search is used. Safe to call repeatedly. */
  const start = useCallback(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void run();
  }, [enabled, run]);

  const pause = useCallback(() => {
    controller.current?.abort();
    setStatus({ kind: "paused", done: index.size, total: pageCount });
  }, [index, pageCount]);

  const resume = useCallback(() => void run(), [run]);

  useEffect(
    () => () => {
      controller.current?.abort();
      clearTimeout(uiTimer.current);
    },
    [],
  );

  const foldedQuery = useMemo(() => foldQuery(query), [query]);
  const results = useMemo(() => {
    void version; // recompute whenever more pages have been indexed
    return foldedQuery.length < MIN_QUERY_LENGTH
      ? EMPTY_RESULTS
      : index.search(foldedQuery, pageCount);
  }, [index, version, foldedQuery, pageCount]);

  const goToHit = useCallback(
    (position: number) => {
      const hit = results.hits[position];
      if (!hit) return;
      setActiveIndex(position);
      setFocusToken((token) => token + 1);
      onGoToPage(hit.page);
    },
    [results.hits, onGoToPage],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      const count = results.hits.length;
      if (count === 0) return;
      const next =
        activeIndex === null
          ? direction === 1
            ? 0
            : count - 1
          : (activeIndex + direction + count) % count;
      goToHit(next);
    },
    [results.hits.length, activeIndex, goToHit],
  );

  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setActiveIndex(null);
  }, []);

  const activeHit: SearchHit | null =
    activeIndex === null ? null : (results.hits[activeIndex] ?? null);
  const highlight: SearchHighlight | null =
    foldedQuery.length < MIN_QUERY_LENGTH
      ? null
      : {
          query: foldedQuery,
          activePage: activeHit?.page ?? null,
          activeOrdinal: activeHit?.ordinal ?? null,
          focusToken,
        };

  return {
    enabled,
    query,
    setQuery: changeQuery,
    status,
    results,
    activeIndex,
    highlight,
    start,
    pause,
    resume,
    goToHit,
    next: () => step(1),
    previous: () => step(-1),
  };
}

export type BookSearch = ReturnType<typeof useBookSearch>;
