import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { foldQuery } from "../lib/fold.ts";
import { BookTextIndex } from "./book-text-index.ts";

function sample() {
  const index = new BookTextIndex();
  index.addPage(1, "Introduction. The café is open.");
  index.addPage(2, "Nothing relevant here.");
  index.addPage(3, "A second CAFE, and a third Café nearby.");
  return index;
}

describe("BookTextIndex", () => {
  it("finds matches across pages in page order, ignoring case and accents", () => {
    const results = sample().search(foldQuery("cafe"), 3);
    assert.deepEqual(
      results.hits.map((h) => [h.page, h.ordinal]),
      [
        [1, 0],
        [3, 0],
        [3, 1],
      ],
    );
    assert.equal(results.totalMatches, 3);
    assert.equal(results.pagesWithMatches, 2);
    assert.equal(results.capped, false);
  });

  it("returns snippets from the original text", () => {
    const [first] = sample().search(foldQuery("cafe"), 3).hits;
    assert.equal(first?.snippet.match, "café");
    assert.ok(first?.snippet.before.includes("Introduction"));
  });

  it("caps shown hits but keeps counting", () => {
    const index = new BookTextIndex();
    index.addPage(1, "ab ".repeat(50));
    const results = index.search("ab", 1, 10);
    assert.equal(results.hits.length, 10);
    assert.equal(results.totalMatches, 50);
    assert.equal(results.capped, true);
  });

  it("searches only the pages indexed so far and reports how many", () => {
    const index = new BookTextIndex();
    index.addPage(2, "needle");
    const results = index.search("needle", 10);
    assert.equal(results.pagesSearched, 1);
    assert.deepEqual(
      results.hits.map((h) => h.page),
      [2],
    );
  });

  it("returns nothing for an empty query", () => {
    assert.equal(sample().search("", 3).hits.length, 0);
  });
});
