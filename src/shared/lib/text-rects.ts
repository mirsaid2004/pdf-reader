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

/**
 * Merges the many per-span boxes of a selected line into one box per line,
 * so stored highlights are small and have no seams between words (and the
 * duplicate boxes a Range sometimes reports for one line don't stack up).
 *
 * Boxes are grouped into lines first (similar top and height), then joined
 * left to right when they touch, overlap, or are separated by under a
 * word-space.
 */
export function mergeLineRects(rects: NormalizedRect[]): NormalizedRect[] {
  const lines: NormalizedRect[][] = [];
  for (const rect of rects.toSorted((a, b) => a.y - b.y)) {
    const line = lines.find((candidate) => {
      const reference = candidate[0];
      return (
        reference !== undefined &&
        Math.abs(rect.y - reference.y) < reference.h * 0.5 &&
        Math.abs(rect.h - reference.h) < reference.h * 0.6
      );
    });
    if (line) line.push(rect);
    else lines.push([rect]);
  }

  const merged: NormalizedRect[] = [];
  for (const line of lines) {
    const [first, ...rest] = line.toSorted((a, b) => a.x - b.x);
    if (!first) continue;
    let current = { ...first };
    for (const rect of rest) {
      const gap = rect.x - (current.x + current.w);
      if (gap < current.h * 0.6) {
        const top = Math.min(current.y, rect.y);
        const bottom = Math.max(current.y + current.h, rect.y + rect.h);
        current = {
          x: current.x,
          y: top,
          w: Math.max(current.x + current.w, rect.x + rect.w) - current.x,
          h: bottom - top,
        };
      } else {
        merged.push(current);
        current = { ...rect };
      }
    }
    merged.push(current);
  }
  return merged.toSorted((a, b) => a.y - b.y || a.x - b.x);
}
