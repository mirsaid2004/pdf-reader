// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

import {
  buildSnippet,
  findMatches,
  toOriginalRange,
  type Snippet,
} from "../lib/find.ts";
import { foldPlain, foldWithMap } from "../lib/fold.ts";

export const MAX_HITS = 500;
/** Stop *counting* beyond this so one-letter-ish queries stay cheap. */
const MAX_COUNTED_MATCHES = 10_000;

export type SearchHit = {
  page: number;
  /** Which occurrence on that page (0-based). */
  ordinal: number;
  snippet: Snippet;
};

export type SearchResults = {
  /** In page order, capped at MAX_HITS. */
  hits: SearchHit[];
  totalMatches: number;
  pagesWithMatches: number;
  capped: boolean;
  /** How many pages were searched (the index may still be filling). */
  pagesSearched: number;
};

export const EMPTY_RESULTS: SearchResults = {
  hits: [],
  totalMatches: 0,
  pagesWithMatches: 0,
  capped: false,
  pagesSearched: 0,
};

/** The text of a book's pages, folded once for fast repeated searching. */
export class BookTextIndex {
  #pages = new Map<number, string>();
  #folded = new Map<number, string>();

  get size(): number {
    return this.#pages.size;
  }

  has(page: number): boolean {
    return this.#pages.has(page);
  }

  addPage(page: number, text: string): void {
    this.#pages.set(page, text);
    this.#folded.set(page, foldPlain(text));
  }

  /** `foldedQuery` must come from `foldQuery()`. */
  search(
    foldedQuery: string,
    pageCount: number,
    maxHits = MAX_HITS,
  ): SearchResults {
    if (foldedQuery === "")
      return { ...EMPTY_RESULTS, pagesSearched: this.#pages.size };

    const hits: SearchHit[] = [];
    let totalMatches = 0;
    let pagesWithMatches = 0;

    for (let page = 1; page <= pageCount; page++) {
      const folded = this.#folded.get(page);
      if (folded === undefined) continue;
      const matches = findMatches(
        folded,
        foldedQuery,
        MAX_COUNTED_MATCHES - totalMatches,
      );
      if (matches.length === 0) continue;

      pagesWithMatches++;
      totalMatches += matches.length;

      if (hits.length < maxHits) {
        // Positions in the original text are only needed for pages we show.
        const original = this.#pages.get(page) ?? "";
        const map = foldWithMap(original);
        for (
          let ordinal = 0;
          ordinal < matches.length && hits.length < maxHits;
          ordinal++
        ) {
          const match = matches[ordinal];
          if (!match) continue;
          hits.push({
            page,
            ordinal,
            snippet: buildSnippet(original, toOriginalRange(map, match)),
          });
        }
      }
      if (totalMatches >= MAX_COUNTED_MATCHES) break;
    }

    return {
      hits,
      totalMatches,
      pagesWithMatches,
      capped: totalMatches > hits.length,
      pagesSearched: this.#pages.size,
    };
  }
}
