import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeLineRects } from "./text-rects.ts";

const rect = (x: number, y: number, w: number, h = 0.02) => ({ x, y, w, h });

describe("mergeLineRects", () => {
  it("joins touching boxes on one line into one", () => {
    const merged = mergeLineRects([
      rect(0.1, 0.2, 0.1),
      rect(0.2, 0.2, 0.15),
      rect(0.36, 0.2, 0.1),
    ]);
    assert.equal(merged.length, 1);
    assert.ok(Math.abs((merged[0]?.x ?? 0) - 0.1) < 1e-9);
    assert.ok(Math.abs((merged[0]?.w ?? 0) - 0.36) < 1e-9);
  });
  it("keeps separate lines separate", () => {
    const merged = mergeLineRects([
      rect(0.1, 0.2, 0.3),
      rect(0.1, 0.25, 0.3),
      rect(0.1, 0.3, 0.2),
    ]);
    assert.equal(merged.length, 3);
  });
  it("does not join distant boxes on the same line", () => {
    const merged = mergeLineRects([rect(0.1, 0.2, 0.1), rect(0.6, 0.2, 0.1)]);
    assert.equal(merged.length, 2);
  });
  it("is independent of input order and does not mutate its input", () => {
    const input = [rect(0.2, 0.2, 0.1), rect(0.1, 0.2, 0.1)];
    const copy = structuredClone(input);
    assert.equal(mergeLineRects(input).length, 1);
    assert.deepEqual(input, copy);
  });
  it("collapses near-duplicate boxes for the same line into one (a Range can report both)", () => {
    const merged = mergeLineRects([
      rect(0.082, 0.171, 0.589, 0.02),
      rect(0.082, 0.173, 0.589, 0.018),
    ]);
    assert.equal(merged.length, 1);
    assert.ok(Math.abs((merged[0]?.w ?? 0) - 0.589) < 1e-9);
    assert.ok(Math.abs((merged[0]?.y ?? 0) - 0.171) < 1e-9);
  });
  it("merges a line whose pieces differ slightly in height and arrive out of order", () => {
    const merged = mergeLineRects([
      rect(0.3, 0.2005, 0.1, 0.019),
      rect(0.1, 0.2, 0.2, 0.02),
      rect(0.4, 0.201, 0.1, 0.02),
    ]);
    assert.equal(merged.length, 1);
    assert.ok(Math.abs((merged[0]?.x ?? 0) - 0.1) < 1e-9);
    assert.ok(Math.abs((merged[0]?.w ?? 0) - 0.4) < 1e-9);
  });
  it("returns lines top to bottom", () => {
    const merged = mergeLineRects([
      rect(0.1, 0.4, 0.2),
      rect(0.1, 0.1, 0.2),
      rect(0.1, 0.25, 0.2),
    ]);
    assert.deepEqual(
      merged.map((m) => m.y),
      [0.1, 0.25, 0.4],
    );
  });
  it("handles empty input", () => {
    assert.deepEqual(mergeLineRects([]), []);
  });
});
