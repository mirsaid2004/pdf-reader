"use client";

import { useEffect, useRef } from "react";

import { MIN_QUERY_LENGTH } from "../lib/fold";
import type { BookSearch } from "../model/use-book-search";

type SearchPanelProps = {
  search: BookSearch;
  /** Whether the book has selectable text at all. */
  hasTextLayer: boolean;
  /** Whether this tab is showing (search starts the first time it is). */
  active: boolean;
  /** Changes whenever the reader asks to focus the search box (e.g. Ctrl+F). */
  focusSignal: number;
  onClose: () => void;
};

export function SearchPanel({
  search,
  hasTextLayer,
  active,
  focusSignal,
  onClose,
}: SearchPanelProps) {
  const { start, status, results, query, activeIndex } = search;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (active && hasTextLayer) start();
  }, [active, hasTextLayer, start]);

  useEffect(() => {
    if (!active || focusSignal === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [active, focusSignal]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!hasTextLayer) {
    return (
      <p
        role="status"
        className="m-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
      >
        This looks like a scanned book without a text layer, so there is no text
        to search. (Reading, bookmarks and the table of contents still work.)
      </p>
    );
  }

  const indexing = status.kind === "indexing" || status.kind === "loading";
  const partial =
    (status.kind === "indexing" || status.kind === "paused") &&
    status.done < status.total
      ? `Searched ${status.done} of ${status.total} pages so far.`
      : null;

  let summary: string | null = null;
  if (query.trim().length >= MIN_QUERY_LENGTH) {
    if (results.totalMatches === 0)
      summary = indexing ? "No matches yet…" : "No matches.";
    else
      summary = `${results.totalMatches.toLocaleString()} ${results.totalMatches === 1 ? "match" : "matches"} on ${results.pagesWithMatches.toLocaleString()} ${results.pagesWithMatches === 1 ? "page" : "pages"}${results.capped ? ` · showing the first ${results.hits.length}` : ""}`;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b border-foreground/10 p-3">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => search.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (event.shiftKey) search.previous();
              else search.next();
            } else if (event.key === "Escape") {
              event.preventDefault();
              if (query) search.setQuery("");
              else onClose();
            }
          }}
          placeholder="Search in this book"
          aria-label="Search in this book"
          className="w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />

        {(status.kind === "indexing" ||
          status.kind === "paused" ||
          status.kind === "loading") && (
          <div className="flex flex-col gap-1">
            {status.kind !== "loading" && (
              <div
                role="progressbar"
                aria-label="Indexing pages"
                aria-valuemin={0}
                aria-valuemax={status.total}
                aria-valuenow={status.done}
                className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
              >
                <div
                  className="h-full bg-foreground/60"
                  style={{
                    width: `${(status.done / Math.max(status.total, 1)) * 100}%`,
                  }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-foreground/60">
              <span>
                {status.kind === "loading" && "Preparing…"}
                {status.kind === "indexing" &&
                  `Indexing pages… ${status.done} / ${status.total}`}
                {status.kind === "paused" &&
                  `Indexing paused · ${status.done} / ${status.total}`}
              </span>
              {status.kind === "indexing" && (
                <button
                  type="button"
                  onClick={search.pause}
                  className="underline underline-offset-2"
                >
                  Cancel
                </button>
              )}
              {status.kind === "paused" && (
                <button
                  type="button"
                  onClick={search.resume}
                  className="underline underline-offset-2"
                >
                  Resume
                </button>
              )}
            </div>
          </div>
        )}
        {status.kind === "error" && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            Couldn’t read the whole book.{" "}
            <button
              type="button"
              onClick={search.resume}
              className="underline underline-offset-2"
            >
              Try again
            </button>
          </p>
        )}

        <p className="min-h-4 text-xs text-foreground/60" aria-live="polite">
          {summary ??
            (query.trim()
              ? `Type at least ${MIN_QUERY_LENGTH} letters.`
              : "Enter to jump to the next match, Shift+Enter for the previous.")}
          {summary && partial ? ` ${partial}` : ""}
        </p>
      </div>

      <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1">
        {results.hits.map((hit, position) => (
          <li key={`${hit.page}-${hit.ordinal}`}>
            <button
              type="button"
              aria-current={position === activeIndex ? "true" : undefined}
              onClick={() => search.goToHit(position)}
              className={`flex w-full gap-3 px-3 py-2 text-left text-sm hover:bg-foreground/5 ${position === activeIndex ? "bg-foreground/10" : ""}`}
            >
              <span className="w-10 shrink-0 text-xs text-foreground/60 tabular-nums">
                p. {hit.page}
              </span>
              <span className="min-w-0 text-foreground/80">
                {hit.snippet.before}
                <mark className="rounded-sm bg-yellow-300/70 px-0.5 text-foreground dark:bg-yellow-400/40">
                  {hit.snippet.match}
                </mark>
                {hit.snippet.after}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
