"use client";

import { type RefObject, useCallback, useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};

export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const active = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const supported = useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled,
    () => false,
  );

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void target.current?.requestFullscreen().catch(() => {});
  }, [target]);

  return { active, supported, toggle };
}
