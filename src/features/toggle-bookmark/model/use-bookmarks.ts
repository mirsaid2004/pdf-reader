"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { Bookmark } from "@/entities/bookmark";
import type { ActionResult } from "@/shared/lib/action-result";

import {
  deleteBookmark,
  setBookmarkLabel,
  toggleBookmark,
} from "../api/actions";

/** The save operations; defaults to the real server actions (tests pass fakes). */
export type BookmarkActions = {
  toggle: (input: {
    bookId: string;
    page: number;
  }) => Promise<ActionResult<{ bookmark: Bookmark | null }>>;
  setLabel: (input: {
    id: string;
    label: string;
  }) => Promise<ActionResult<{ label: string | null }>>;
  remove: (id: string) => Promise<ActionResult>;
};

const serverActions: BookmarkActions = {
  toggle: toggleBookmark,
  setLabel: setBookmarkLabel,
  remove: deleteBookmark,
};

const byPage = (a: Bookmark, b: Bookmark) => a.page - b.page;

/** A book's bookmarks. Changes show immediately and roll back if saving fails. */
export function useBookmarks(params: {
  bookId: string;
  initial: Bookmark[];
  actions?: BookmarkActions;
}) {
  const { bookId, initial, actions = serverActions } = params;
  const [items, setItems] = useState<Bookmark[]>(() =>
    initial.toSorted(byPage),
  );
  const [error, setError] = useState<string | null>(null);
  const pendingPages = useRef(new Set<number>());

  const pages = useMemo(() => new Set(items.map((item) => item.page)), [items]);
  const has = useCallback((page: number) => pages.has(page), [pages]);

  const toggleAt = useCallback(
    async (page: number) => {
      if (pendingPages.current.has(page)) return; // ignore double presses while saving
      pendingPages.current.add(page);
      setError(null);

      const existing = items.find((item) => item.page === page);
      const temp: Bookmark = {
        id: `temp-${page}`,
        page,
        label: null,
        createdAt: new Date(),
      };
      setItems((prev) =>
        existing
          ? prev.filter((item) => item.page !== page)
          : [...prev, temp].toSorted(byPage),
      );

      const result = await actions.toggle({ bookId, page });
      pendingPages.current.delete(page);

      if (!result.ok) {
        setError(result.error);
        setItems((prev) =>
          existing
            ? [...prev.filter((item) => item.page !== page), existing].toSorted(
                byPage,
              )
            : prev.filter((item) => item.id !== temp.id),
        );
        return;
      }
      const saved = result.data.bookmark;
      setItems((prev) => {
        const without = prev.filter((item) => item.page !== page);
        return (saved ? [...without, saved] : without).toSorted(byPage);
      });
    },
    [actions, bookId, items],
  );

  const setLabel = useCallback(
    async (id: string, label: string) => {
      const previous = items.find((item) => item.id === id)?.label ?? null;
      const next = label.trim() === "" ? null : label.trim();
      if (next === previous || id.startsWith("temp-")) return;
      setError(null);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, label: next } : item)),
      );

      const result = await actions.setLabel({ id, label });
      if (!result.ok) {
        setError(result.error);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, label: previous } : item,
          ),
        );
      }
    },
    [actions, items],
  );

  const remove = useCallback(
    async (id: string) => {
      const existing = items.find((item) => item.id === id);
      if (!existing || id.startsWith("temp-")) return;
      setError(null);
      setItems((prev) => prev.filter((item) => item.id !== id));

      const result = await actions.remove(id);
      if (!result.ok) {
        setError(result.error);
        setItems((prev) => [...prev, existing].toSorted(byPage));
      }
    },
    [actions, items],
  );

  return {
    items,
    has,
    toggleAt,
    setLabel,
    remove,
    error,
    dismissError: () => setError(null),
  };
}

export type BookmarksState = ReturnType<typeof useBookmarks>;
