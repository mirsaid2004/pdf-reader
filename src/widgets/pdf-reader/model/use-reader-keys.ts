"use client";

import { useEffect, useEffectEvent } from "react";

export type ReaderKeyActions = {
  previousPage: () => void;
  nextPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
  openSearch: () => void;
  toggleContents: () => void;
  closeSidebar: () => void;
  toggleBookmark: () => void;
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * ←/→ (and PageUp/PageDown) turn pages, +/- zoom, f toggles fullscreen,
 * Home/End jump, b bookmarks the page, t toggles Contents, / or Ctrl/Cmd+F opens Search, Esc closes the sidebar.
 *
 * Ctrl/Cmd+F is taken over on purpose: the browser's own find only sees the
 * few pages currently mounted, so it would silently miss most of the book.
 */
export function useReaderKeys(actions: ReaderKeyActions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
      actions.openSearch();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    const handlers: Record<string, () => void> = {
      ArrowLeft: actions.previousPage,
      PageUp: actions.previousPage,
      ArrowRight: actions.nextPage,
      PageDown: actions.nextPage,
      Home: actions.firstPage,
      End: actions.lastPage,
      "+": actions.zoomIn,
      "=": actions.zoomIn,
      "-": actions.zoomOut,
      _: actions.zoomOut,
      f: actions.toggleFullscreen,
      "/": actions.openSearch,
      t: actions.toggleContents,
      b: actions.toggleBookmark,
      B: actions.toggleBookmark,
      T: actions.toggleContents,
      Escape: actions.closeSidebar,
      F: actions.toggleFullscreen,
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
