/**
 * Rectangles measured against a page's size (each value 0–1), so they stay
 * correct at any zoom level. Used for search hits now and for user
 * highlights (Phase 7).
 */
export type NormalizedRect = { x: number; y: number; w: number; h: number };

const MIN_SIZE_PX = 0.5;

/** The on-screen boxes of a DOM `Range`, expressed relative to `container`. */
export function normalizedRectsFromRange(
  range: Range,
  container: HTMLElement,
): NormalizedRect[] {
  const box = container.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return [];

  const rects: NormalizedRect[] = [];
  for (const rect of range.getClientRects()) {
    if (rect.width < MIN_SIZE_PX || rect.height < MIN_SIZE_PX) continue;
    const next: NormalizedRect = {
      x: (rect.left - box.left) / box.width,
      y: (rect.top - box.top) / box.height,
      w: rect.width / box.width,
      h: rect.height / box.height,
    };
    // Ranges can report the same box twice (text node + element).
    const duplicate = rects.some(
      (r) =>
        Math.abs(r.x - next.x) < 0.0005 &&
        Math.abs(r.y - next.y) < 0.0005 &&
        Math.abs(r.w - next.w) < 0.0005 &&
        Math.abs(r.h - next.h) < 0.0005,
    );
    if (!duplicate) rects.push(next);
  }
  return rects;
}
