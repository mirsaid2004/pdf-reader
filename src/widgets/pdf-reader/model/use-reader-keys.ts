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
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** ←/→ (and PageUp/PageDown) turn pages, +/- zoom, f toggles fullscreen, Home/End jump. */
export function useReaderKeys(actions: ReaderKeyActions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
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
