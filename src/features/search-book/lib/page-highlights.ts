import {
  normalizedRectsFromRange,
  type NormalizedRect,
} from "@/shared/lib/text-rects";

import { findMatches, toOriginalRange } from "./find";
import { foldWithMap } from "./fold";

const MAX_MATCHES_PER_PAGE = 300;

type Owner = { div: number; offset: number };

/**
 * Where each search hit is on a rendered page, as one list of rectangles per
 * hit (a hit can span several lines/spans).
 *
 * The page text is rebuilt from the text layer the same way the indexer builds
 * it from pdf.js (item strings concatenated, "\n" where a line ends — pdf.js
 * puts a <br> right after such a span), so hit numbers line up with the
 * search results list.
 */
export function computeSearchRects(params: {
  /** textLayer.textDivs */
  divs: readonly HTMLElement[];
  /** textLayer.textContentItemsStr (same order as divs) */
  strings: readonly string[];
  foldedQuery: string;
  /** The page element the rectangles are measured against. */
  pageElement: HTMLElement;
}): NormalizedRect[][] {
  const { divs, strings, foldedQuery, pageElement } = params;
  if (foldedQuery === "") return [];

  // Page text + for every character, which span and offset it came from.
  let pageText = "";
  const owners: (Owner | null)[] = [];
  divs.forEach((div, index) => {
    const text = strings[index] ?? "";
    for (let offset = 0; offset < text.length; offset++)
      owners.push({ div: index, offset });
    pageText += text;
    if (div.nextElementSibling?.tagName === "BR") {
      pageText += "\n";
      owners.push(null); // synthetic line break: nothing to highlight
    }
  });

  const folded = foldWithMap(pageText);
  const matches = findMatches(folded.text, foldedQuery, MAX_MATCHES_PER_PAGE);

  return matches.map((match) => {
    const { start, end } = toOriginalRange(folded, match);

    // Group the matched characters by span → one Range per span.
    const pieces = new Map<number, { from: number; to: number }>();
    for (let i = start; i < end; i++) {
      const owner = owners[i];
      if (!owner) continue;
      const piece = pieces.get(owner.div);
      if (piece) piece.to = owner.offset + 1;
      else pieces.set(owner.div, { from: owner.offset, to: owner.offset + 1 });
    }

    const rects: NormalizedRect[] = [];
    for (const [divIndex, { from, to }] of pieces) {
      const node = divs[divIndex]?.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) continue;
      const range = document.createRange();
      const length = node.textContent?.length ?? 0;
      range.setStart(node, Math.min(from, length));
      range.setEnd(node, Math.min(to, length));
      rects.push(...normalizedRectsFromRange(range, pageElement));
    }
    return rects;
  });
}
