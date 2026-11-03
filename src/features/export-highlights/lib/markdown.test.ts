import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { exportFileName, formatHighlightsMarkdown } from "./markdown.ts";

const exportedAt = new Date("2026-11-03T12:00:00Z");

describe("formatHighlightsMarkdown", () => {
  it("writes a header, groups by page, and includes notes", () => {
    const md = formatHighlightsMarkdown({
      title: "Dune",
      author: "Frank Herbert",
      exportedAt,
      highlights: [
        {
          page: 3,
          text: "Fear is the mind-killer.",
          note: "Litany against fear",
          color: "yellow",
        },
        { page: 3, text: "I must not fear.", note: null, color: "green" },
        { page: 9, text: "The spice must flow.", note: null, color: "blue" },
      ],
    });
    assert.ok(
      md.startsWith(
        "# Dune\n\n*Frank Herbert*\n\nExported 2026-11-03 · 3 highlights\n",
      ),
    );
    assert.equal(
      md.match(/^## Page 3$/gm)?.length,
      1,
      "page 3 heading appears once",
    );
    assert.ok(md.indexOf("## Page 3") < md.indexOf("## Page 9"));
    assert.ok(
      md.includes(
        "> Fear is the mind-killer.\n<!-- color: yellow -->\n\n**Note:** Litany against fear",
      ),
    );
    assert.ok(md.includes("> The spice must flow."));
  });

  it("quotes every line of a multi-line highlight and keeps note line breaks", () => {
    const md = formatHighlightsMarkdown({
      title: "T",
      author: null,
      exportedAt,
      highlights: [
        { page: 1, text: "line one\nline two", note: "a\nb", color: "pink" },
      ],
    });
    assert.ok(md.includes("> line one\n> line two"));
    assert.ok(md.includes("**Note:** a  \nb"));
  });

  it("handles no highlights, no author and messy titles", () => {
    const md = formatHighlightsMarkdown({
      title: "  A\n\nB  ",
      author: null,
      exportedAt,
      highlights: [],
    });
    assert.ok(md.startsWith("# A B\n"));
    assert.ok(md.includes("0 highlights"));
    assert.ok(md.includes("_No highlights yet._"));
    assert.ok(!md.includes("*null*"));
  });
});

describe("exportFileName", () => {
  it("makes a safe slug", () => {
    assert.equal(
      exportFileName("Dune: Messiah (2nd ed.)"),
      "dune-messiah-2nd-ed-highlights.md",
    );
    assert.equal(exportFileName("Café Müller"), "cafe-muller-highlights.md");
  });
  it("falls back when nothing usable remains", () => {
    assert.equal(exportFileName("???"), "book-highlights.md");
  });
});
