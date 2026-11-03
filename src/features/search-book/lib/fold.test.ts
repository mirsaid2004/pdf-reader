import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSnippet,
  findMatches,
  snippetsForPage,
  toOriginalRange,
} from "./find.ts";
import { foldPlain, foldQuery, foldWithMap } from "./fold.ts";

describe("foldPlain", () => {
  it("lower-cases and strips accents", () => {
    assert.equal(foldPlain("Café Crème"), "cafe creme");
  });
  it("expands ligatures", () => {
    assert.equal(foldPlain("eﬃcient ﬁnd"), "efficient find");
  });
  it("collapses any whitespace, including newlines, to single spaces", () => {
    assert.equal(foldPlain("a\n\n  b\tc"), "a b c");
  });
  it("handles surrogate pairs without breaking them", () => {
    assert.equal(foldPlain("x😀y"), "x😀y");
  });
  it("trims the query", () => {
    assert.equal(foldQuery("  Hello  World "), "hello world");
  });
});

describe("foldWithMap", () => {
  it("produces exactly the same text as foldPlain", () => {
    const samples = [
      "Café  au\nlait",
      "eﬃcient",
      "İstanbul",
      "áb",
      "x😀y  z",
      "",
    ];
    for (const sample of samples) {
      assert.equal(
        foldWithMap(sample).text,
        foldPlain(sample),
        JSON.stringify(sample),
      );
    }
  });
  it("maps folded characters back to original positions", () => {
    const folded = foldWithMap("Café  Au");
    assert.equal(folded.text, "cafe au");
    // "é" (index 3) folds to "e"; the two spaces collapse into one at index 4
    assert.equal(folded.starts[3], 3);
    assert.equal(folded.ends[3], 4);
    assert.equal(folded.starts[5], 6); // "a" of "Au"
  });
});

describe("findMatches", () => {
  it("finds non-overlapping matches in order", () => {
    assert.deepEqual(findMatches("aaaa", "aa"), [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });
  it("respects the limit and empty queries", () => {
    assert.equal(findMatches("abab", "ab", 1).length, 1);
    assert.equal(findMatches("abab", "").length, 0);
  });
  it("matches across a line break written as a space", () => {
    const folded = foldWithMap("end of the\nline");
    assert.equal(findMatches(folded.text, "the line").length, 1);
  });
});

describe("snippets", () => {
  it("returns the original (accented, cased) text around the match", () => {
    const text =
      "Le Café de la Gare est ouvert tous les jours, même le dimanche matin.";
    const [snippet] = snippetsForPage(text, foldQuery("cafe"));
    assert.ok(snippet);
    assert.equal(snippet.match, "Café");
  });
  it("adds ellipses when the excerpt is cut", () => {
    const text = `${"word ".repeat(40)}NEEDLE${" word".repeat(40)}`;
    const folded = foldWithMap(text);
    const [match] = findMatches(folded.text, "needle");
    assert.ok(match);
    const snippet = buildSnippet(text, toOriginalRange(folded, match));
    assert.equal(snippet.match, "NEEDLE");
    assert.ok(snippet.before.startsWith("…"));
    assert.ok(snippet.after.endsWith("…"));
    assert.ok(snippet.before.length < 60 && snippet.after.length < 60);
  });
  it("covers a ligature match back to the original characters", () => {
    const text = "an eﬃcient method";
    const folded = foldWithMap(text);
    const [match] = findMatches(folded.text, "efficient");
    assert.ok(match);
    assert.equal(
      text.slice(
        toOriginalRange(folded, match).start,
        toOriginalRange(folded, match).end,
      ),
      "eﬃcient",
    );
  });
});
