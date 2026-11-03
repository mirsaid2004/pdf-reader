import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ancestorIds,
  findCurrentSectionId,
  flattenOutline,
  type OutlineNode,
} from "./outline.ts";

const outline: OutlineNode[] = [
  { title: "Preface", page: 3, items: [] },
  {
    title: "Part I",
    page: 10,
    items: [
      {
        title: "Chapter 1",
        page: 11,
        items: [{ title: "1.1", page: 12, items: [] }],
      },
      { title: "Chapter 2", page: 20, items: [] },
    ],
  },
  { title: "Broken link", page: null, items: [] },
  { title: "Appendix", page: 100, items: [] },
];

describe("flattenOutline", () => {
  const flat = flattenOutline(outline);
  it("keeps document order with depths and path ids", () => {
    assert.deepEqual(
      flat.map((i) => [i.id, i.depth]),
      [
        ["0", 0],
        ["1", 0],
        ["1.0", 1],
        ["1.0.0", 2],
        ["1.1", 1],
        ["2", 0],
        ["3", 0],
      ],
    );
  });
  it("records parents and children", () => {
    assert.equal(flat.find((i) => i.id === "1.0.0")?.parentId, "1.0");
    assert.equal(flat.find((i) => i.id === "1")?.hasChildren, true);
    assert.equal(flat.find((i) => i.id === "0")?.hasChildren, false);
  });
});

describe("findCurrentSectionId", () => {
  const flat = flattenOutline(outline);
  const title = (id: string | null) =>
    flat.find((i) => i.id === id)?.title ?? null;

  it("is null before the first entry", () => {
    assert.equal(findCurrentSectionId(flat, 1), null);
  });
  it("picks the entry with the greatest page not after the current page", () => {
    assert.equal(title(findCurrentSectionId(flat, 3)), "Preface");
    assert.equal(title(findCurrentSectionId(flat, 15)), "1.1");
    assert.equal(title(findCurrentSectionId(flat, 25)), "Chapter 2");
    assert.equal(title(findCurrentSectionId(flat, 500)), "Appendix");
  });
  it("prefers the deeper entry when pages tie", () => {
    const tied = flattenOutline([
      { title: "A", page: 5, items: [{ title: "A.1", page: 5, items: [] }] },
    ]);
    assert.equal(
      tied.find((i) => i.id === findCurrentSectionId(tied, 5))?.title,
      "A.1",
    );
  });
  it("skips entries without a page", () => {
    assert.notEqual(title(findCurrentSectionId(flat, 50)), "Broken link");
  });
});

describe("ancestorIds", () => {
  it("lists ancestors outermost first", () => {
    const flat = flattenOutline(outline);
    assert.deepEqual(ancestorIds(flat, "1.0.0"), ["1", "1.0"]);
    assert.deepEqual(ancestorIds(flat, "0"), []);
  });
});
