"use client";

import { useCallback, useEffect, useState } from "react";

import { captureSelection, type CapturedSelection } from "../lib/selection";

const MOUSE_SETTLE_MS = 120;
/** Touch selection handles keep moving the selection; wait until it settles. */
const TOUCH_SETTLE_MS = 400;
const SCROLL_REFRESH_MS = 120;

/**
 * The reader's current text selection (split per page), once it has settled.
 * While the mouse is still dragging nothing is reported, so the colour bar
 * doesn't flicker under the pointer.
 */
export function useTextSelection(root: HTMLElement | null) {
  const [selection, setSelection] = useState<CapturedSelection | null>(null);

  useEffect(() => {
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mouseDown = false;
    let lastPointerType = "mouse";

    const evaluate = () => setSelection(captureSelection(root));
    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(evaluate, delay);
    };

    const onSelectionChange = () => {
      if (mouseDown) return;
      schedule(lastPointerType === "touch" ? TOUCH_SETTLE_MS : MOUSE_SETTLE_MS);
    };
    const onPointerDown = (event: PointerEvent) => {
      lastPointerType = event.pointerType;
      if (event.pointerType === "mouse") mouseDown = true;
    };
    const onPointerUp = () => {
      if (!mouseDown) return;
      mouseDown = false;
      schedule(30);
    };
    // The bar is positioned from the selection's on-screen box, so follow scrolling.
    const onScroll = () => {
      if (window.getSelection()?.isCollapsed ?? true) return;
      schedule(SCROLL_REFRESH_MS);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    root.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelectionChange);
      root.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("scroll", onScroll);
    };
  }, [root]);

  /** Drops the selection (and the browser's own highlight of it). */
  const clear = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  return { selection, clear };
}
