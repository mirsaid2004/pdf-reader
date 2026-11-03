import { foldWithMap, type FoldedText } from "./fold.ts";

export type TextMatch = {
  /** Offsets into the *folded* text. */
  start: number;
  end: number;
};

/**
 * All non-overlapping occurrences of `foldedQuery` in `foldedText` (both
 * already folded), in order, up to `limit`.
 */
export function findMatches(
  foldedText: string,
  foldedQuery: string,
  limit = Infinity,
): TextMatch[] {
  if (foldedQuery === "") return [];
  const matches: TextMatch[] = [];
  let from = 0;
  while (matches.length < limit) {
    const start = foldedText.indexOf(foldedQuery, from);
    if (start === -1) break;
    const end = start + foldedQuery.length;
    matches.push({ start, end });
    from = end;
  }
  return matches;
}

/** Folded-text offsets → the matching range of the *original* text. */
export function toOriginalRange(
  folded: FoldedText,
  match: TextMatch,
): { start: number; end: number } {
  return {
    start: folded.starts[match.start] ?? 0,
    end: folded.ends[match.end - 1] ?? folded.ends.at(-1) ?? 0,
  };
}

export type Snippet = { before: string; match: string; after: string };

const SNIPPET_RADIUS = 40;

const tidy = (text: string) => text.replace(/\s+/g, " ");

/** A short, readable excerpt around a match, taken from the original (unfolded) text. */
export function buildSnippet(
  original: string,
  range: { start: number; end: number },
): Snippet {
  const { start, end } = range;
  let from = Math.max(0, start - SNIPPET_RADIUS);
  let to = Math.min(original.length, end + SNIPPET_RADIUS);

  // Don't start/stop mid-word when there's a nearby space to cut at.
  if (from > 0) {
    const space = original.indexOf(" ", from);
    if (space !== -1 && space < start) from = space + 1;
  }
  if (to < original.length) {
    const space = original.lastIndexOf(" ", to);
    if (space > end) to = space;
  }

  const before = tidy(original.slice(from, start));
  const after = tidy(original.slice(end, to));
  return {
    before: (from > 0 ? "…" : "") + before.trimStart(),
    match: tidy(original.slice(start, end)),
    after: after.trimEnd() + (to < original.length ? "…" : ""),
  };
}

/** Convenience for tests and callers that have raw page text. */
export function snippetsForPage(
  original: string,
  foldedQuery: string,
  limit = Infinity,
): Snippet[] {
  const folded = foldWithMap(original);
  return findMatches(folded.text, foldedQuery, limit).map((match) =>
    buildSnippet(original, toOriginalRange(folded, match)),
  );
}
