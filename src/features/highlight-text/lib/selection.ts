import {
  mergeLineRects,
  normalizedRectsFromRange,
  type NormalizedRect,
} from "@/shared/lib/text-rects";

export type SelectionPart = {
  page: number;
  text: string;
  rects: NormalizedRect[];
};

export type ViewportBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CapturedSelection = {
  /** One part per page the selection touches, in page order. */
  parts: SelectionPart[];
  /** Where the selection is on screen (for placing the colour bar). */
  anchor: ViewportBox;
};

/**
 * The text inside `range` that lies within one page's text layer. Built from
 * text nodes so line ends become spaces (pdf.js text spans have none between
 * lines, which would glue words together).
 */
function textInRange(range: Range, textLayer: Element): string {
  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
  const pieces: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node instanceof Text) || !range.intersectsNode(node)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    pieces.push(node.data.slice(start, end));
    // pdf.js puts a <br> right after the span that ends a line.
    if (
      end === node.length &&
      node.parentElement?.nextElementSibling?.tagName === "BR"
    )
      pieces.push(" ");
  }
  return pieces.join("").replace(/\s+/g, " ").trim();
}

/**
 * What is currently selected inside the reader's scroll area, split per page
 * (pages are separate elements, and a stored highlight belongs to one page).
 * Returns null when nothing usable is selected.
 */
export function captureSelection(root: HTMLElement): CapturedSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const parts: SelectionPart[] = [];
  for (const pageElement of root.querySelectorAll<HTMLElement>(
    ".pdf-page[data-page]",
  )) {
    const textLayer = pageElement.querySelector(".textLayer");
    if (!textLayer || !range.intersectsNode(textLayer)) continue;

    // Clip the selection to this page's text layer.
    const layerRange = document.createRange();
    layerRange.selectNodeContents(textLayer);
    const clipped = range.cloneRange();
    if (clipped.compareBoundaryPoints(Range.START_TO_START, layerRange) < 0) {
      clipped.setStart(layerRange.startContainer, layerRange.startOffset);
    }
    if (clipped.compareBoundaryPoints(Range.END_TO_END, layerRange) > 0) {
      clipped.setEnd(layerRange.endContainer, layerRange.endOffset);
    }

    const text = textInRange(clipped, textLayer);
    const rects = mergeLineRects(
      normalizedRectsFromRange(clipped, pageElement),
    );
    const page = Number(pageElement.dataset.page);
    if (text && rects.length > 0 && Number.isInteger(page))
      parts.push({ page, text, rects });
  }
  if (parts.length === 0) return null;

  const box = range.getBoundingClientRect();
  return {
    parts: parts.toSorted((a, b) => a.page - b.page),
    anchor: {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
    },
  };
}

/** The highlight under a point on a page, found from saved rectangles (the overlay can't take clicks). */
export function pageAtPoint(
  clientX: number,
  clientY: number,
): { page: number; x: number; y: number; element: HTMLElement } | null {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    if (
      !(element instanceof HTMLElement) ||
      !element.matches(".pdf-page[data-page]")
    )
      continue;
    const box = element.getBoundingClientRect();
    return {
      page: Number(element.dataset.page),
      x: (clientX - box.left) / box.width,
      y: (clientY - box.top) / box.height,
      element,
    };
  }
  return null;
}
