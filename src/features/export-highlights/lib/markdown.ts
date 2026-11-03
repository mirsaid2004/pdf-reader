// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

export type ExportHighlight = {
  page: number;
  text: string;
  note: string | null;
  color: string;
};

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/** Every line of a block, prefixed as a Markdown blockquote. */
const quote = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");

/**
 * A book's highlights and notes as Markdown, grouped by page. Highlights are
 * expected in reading order. The colour is kept as an invisible HTML comment
 * so it survives in the source without cluttering the rendered text.
 */
export function formatHighlightsMarkdown(params: {
  title: string;
  author: string | null;
  exportedAt: Date;
  highlights: ExportHighlight[];
}): string {
  const { title, author, exportedAt, highlights } = params;
  const lines: string[] = [`# ${oneLine(title) || "Untitled"}`, ""];
  if (author && oneLine(author)) lines.push(`*${oneLine(author)}*`, "");

  const count = highlights.length;
  lines.push(
    `Exported ${exportedAt.toISOString().slice(0, 10)} · ${count} ${count === 1 ? "highlight" : "highlights"}`,
    "",
  );

  if (count === 0) {
    lines.push("_No highlights yet._", "");
    return lines.join("\n");
  }

  let currentPage: number | null = null;
  for (const highlight of highlights) {
    if (highlight.page !== currentPage) {
      currentPage = highlight.page;
      lines.push(`## Page ${highlight.page}`, "");
    }
    lines.push(quote(highlight.text), `<!-- color: ${highlight.color} -->`, "");
    if (highlight.note)
      lines.push(
        `**Note:** ${highlight.note.trim().replace(/\r?\n/g, "  \n")}`,
        "",
      );
  }
  return lines.join("\n");
}

/** A safe file name like "my-book-highlights.md". */
export function exportFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "book"}-highlights.md`;
}
