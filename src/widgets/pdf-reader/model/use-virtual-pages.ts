"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** A page's size in PDF points at scale 1. */
export type PageSize = { width: number; height: number };

export const PAGE_GAP = 12;
export const PAD_X = 16;
/** Space above the first page; also where a "jumped-to" page lands (below the toolbar). */
export const PAD_TOP = 56;
const PAD_BOTTOM = 32;
const OVERSCAN_SCREENS = 1.5;

export type PagesLayout = {
  tops: Float64Array;
  heights: Float64Array;
  widths: Float64Array;
  totalHeight: number;
  contentWidth: number;
};

export type PagesView = {
  /** 0-based indexes of the pages to mount (visible + overscan). */
  first: number;
  last: number;
  /** 1-based page the reader is "on". */
  current: number;
};

const at = (array: Float64Array, index: number) => array[index] ?? 0;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Index of the page whose slot contains content-y `y`. */
function findPage(layout: PagesLayout, y: number): number {
  let lo = 0;
  let hi = layout.tops.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (at(layout.tops, mid) - PAGE_GAP / 2 <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Virtualized vertical page layout. Page sizes start as an estimate (page 1's
 * size) and are corrected as pages report their real size; an "anchor"
 * (page + fraction) keeps what you're looking at in place through those
 * corrections, zoom changes, and resizes.
 */
export function useVirtualPages(params: {
  el: HTMLElement | null;
  size: { width: number; height: number };
  pageCount: number;
  defaultSize: PageSize;
  /** CSS pixels per PDF point. */
  scale: number;
  initialPage: number;
}) {
  const { el, size, pageCount, defaultSize, scale, initialPage } = params;

  const [overrides, setOverrides] = useState<ReadonlyMap<number, PageSize>>(
    () => new Map(),
  );
  const [view, setView] = useState<PagesView>({
    first: 0,
    last: Math.min(pageCount - 1, 3),
    current: initialPage,
  });
  // The scroller is mutated imperatively (scrollTop), so keep it in a ref.
  const elRef = useRef<HTMLElement | null>(null);
  const anchor = useRef({ page: initialPage, ratio: 0 });
  const layoutRef = useRef<PagesLayout | null>(null);
  const pending = useRef(new Map<number, PageSize>());
  const flushFrame = useRef(0);
  const scrollFrame = useRef(0);

  const layout = useMemo<PagesLayout>(() => {
    const tops = new Float64Array(pageCount);
    const heights = new Float64Array(pageCount);
    const widths = new Float64Array(pageCount);
    let y = PAD_TOP;
    let maxWidth = 0;
    for (let i = 0; i < pageCount; i++) {
      const pageSize = overrides.get(i + 1) ?? defaultSize;
      const width = pageSize.width * scale;
      const height = pageSize.height * scale;
      tops[i] = y;
      heights[i] = height;
      widths[i] = width;
      y += height + PAGE_GAP;
      if (width > maxWidth) maxWidth = width;
    }
    return {
      tops,
      heights,
      widths,
      totalHeight: y - PAGE_GAP + PAD_BOTTOM,
      contentWidth: Math.max(maxWidth + PAD_X * 2, size.width),
    };
  }, [pageCount, overrides, defaultSize, scale, size.width]);

  const updateView = useCallback((scroller: HTMLElement, l: PagesLayout) => {
    const top = scroller.scrollTop;
    const height = scroller.clientHeight;
    const overscan = height * OVERSCAN_SCREENS;
    const next: PagesView = {
      first: findPage(l, top - overscan),
      last: findPage(l, top + height + overscan),
      current: findPage(l, top + height * 0.4) + 1,
    };
    setView((prev) =>
      prev.first === next.first &&
      prev.last === next.last &&
      prev.current === next.current
        ? prev
        : next,
    );
  }, []);

  useLayoutEffect(() => {
    elRef.current = el;
  }, [el]);

  // After any layout change (sizes, zoom, resize): put the anchor back where it was.
  useLayoutEffect(() => {
    layoutRef.current = layout;
    const node = elRef.current;
    if (!el || !node || size.height === 0) return;
    const index = clamp(anchor.current.page - 1, 0, pageCount - 1);
    const target = Math.max(
      0,
      at(layout.tops, index) +
        anchor.current.ratio * at(layout.heights, index) -
        PAD_TOP,
    );
    // Imperative DOM sync after layout is exactly what a layout effect is for.
    if (Math.abs(node.scrollTop - target) > 0.5) node.scrollTop = target;
    updateView(node, layout);
  }, [el, layout, size.height, pageCount, updateView]);

  useEffect(() => {
    if (!el) return;
    const onScroll = () => {
      if (scrollFrame.current) return;
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = 0;
        const l = layoutRef.current;
        if (!l) return;
        const y = el.scrollTop + PAD_TOP;
        const index = findPage(l, y);
        anchor.current = {
          page: index + 1,
          ratio: (y - at(l.tops, index)) / Math.max(1, at(l.heights, index)),
        };
        updateView(el, l);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = 0;
    };
  }, [el, updateView]);

  useEffect(() => () => cancelAnimationFrame(flushFrame.current), []);

  /** Pages call this with their real size; corrections are batched per frame. */
  const reportSize = useCallback(
    (page: number, pageSize: PageSize) => {
      pending.current.set(page, pageSize);
      if (flushFrame.current) return;
      flushFrame.current = requestAnimationFrame(() => {
        flushFrame.current = 0;
        const batch = pending.current;
        pending.current = new Map();
        setOverrides((prev) => {
          let next: Map<number, PageSize> | null = null;
          for (const [pageNumber, s] of batch) {
            const current = prev.get(pageNumber) ?? defaultSize;
            if (
              Math.abs(current.width - s.width) > 0.5 ||
              Math.abs(current.height - s.height) > 0.5
            ) {
              next ??= new Map(prev);
              next.set(pageNumber, s);
            }
          }
          return next ?? prev;
        });
      });
    },
    [defaultSize],
  );

  const scrollToPage = useCallback(
    (page: number) => {
      const node = elRef.current;
      const l = layoutRef.current;
      if (!node || !l) return;
      const index = clamp(page - 1, 0, pageCount - 1);
      anchor.current = { page: index + 1, ratio: 0 };
      node.scrollTop = Math.max(0, at(l.tops, index) - PAD_TOP);
    },
    [pageCount],
  );

  return { layout, view, reportSize, scrollToPage };
}
