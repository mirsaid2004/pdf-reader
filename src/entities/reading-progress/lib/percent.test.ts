import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { percentForPage } from "./percent.ts";

describe("percentForPage", () => {
  it("is 0% on page 1 and 100% on the last page", () => {
    assert.equal(percentForPage(1, 300), 0);
    assert.equal(percentForPage(300, 300), 100);
  });
  it("is proportional in between, rounded to one decimal", () => {
    assert.equal(percentForPage(151, 301), 50);
    assert.equal(percentForPage(2, 4), 33.3);
  });
  it("clamps out-of-range pages", () => {
    assert.equal(percentForPage(0, 10), 0);
    assert.equal(percentForPage(99, 10), 100);
  });
  it("handles single-page books", () => {
    assert.equal(percentForPage(1, 1), 0);
  });
});
