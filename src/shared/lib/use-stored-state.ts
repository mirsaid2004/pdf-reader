"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
// Fallback when localStorage is unavailable or throws (private mode, blocked).
const memory = new Map<string, string>();

function read(key: string): string | null {
  const fromMemory = memory.get(key);
  if (fromMemory !== undefined) return fromMemory;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A string preference persisted in localStorage (per device). SSR-safe: the
 * server snapshot is always `fallback`, then the stored value takes over.
 */
export function useStoredState(
  key: string,
  fallback: string,
): [string, (next: string) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );

  const set = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // kept in memory for this session
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, set];
}
