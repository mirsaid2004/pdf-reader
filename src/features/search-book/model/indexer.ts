import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Reads page text with pdf.js, one page at a time (low priority: it yields
 * between pages so reading stays smooth). The text is built exactly like the
 * reader's text layer is (items concatenated, "\n" after a line end), which is
 * what lets search hits be located on the rendered page.
 */
export async function indexPages(params: {
  doc: PDFDocumentProxy;
  /** Page numbers, in the order to index them. */
  pages: number[];
  signal: AbortSignal;
  onPage: (page: number, text: string) => void;
}): Promise<void> {
  const { doc, pages, signal, onPage } = params;
  for (const number of pages) {
    if (signal.aborted) return;
    const page = await doc.getPage(number);
    const content = await page.getTextContent();
    page.cleanup();
    if (signal.aborted) return;

    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str;
      if (item.hasEOL) text += "\n";
    }
    onPage(number, text);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
