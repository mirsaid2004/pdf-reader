"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type {
  Highlight,
  HighlightColor,
  NormalizedRect,
} from "@/entities/highlight";
import type { ActionResult } from "@/shared/lib/action-result";

import {
  createHighlights,
  deleteHighlight,
  updateHighlight,
} from "../api/actions";

export type HighlightPart = {
  page: number;
  text: string;
  rects: NormalizedRect[];
};

/** The save operations; defaults to the real server actions (tests pass fakes). */
export type HighlightActions = {
  create: (input: {
    bookId: string;
    color: HighlightColor;
    note?: string;
    parts: HighlightPart[];
  }) => Promise<ActionResult<{ highlights: Highlight[] }>>;
  update: (input: {
    id: string;
    color?: HighlightColor;
    note?: string | null;
  }) => Promise<ActionResult<{ highlight: Highlight }>>;
  remove: (id: string) => Promise<ActionResult>;
};

const serverActions: HighlightActions = {
  create: createHighlights,
  update: updateHighlight,
  remove: deleteHighlight,
};

const readingOrder = (a: Highlight, b: Highlight) =>
  a.page - b.page ||
  (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0) ||
  (a.rects[0]?.x ?? 0) - (b.rects[0]?.x ?? 0);

const EMPTY: Highlight[] = [];

/** A book's highlights. Changes show immediately and roll back if saving fails. */
export function useHighlights(params: {
  bookId: string;
  initial: Highlight[];
  actions?: HighlightActions;
}) {
  const { bookId, initial, actions = serverActions } = params;
  const [items, setItems] = useState<Highlight[]>(() =>
    initial.toSorted(readingOrder),
  );
  const [error, setError] = useState<string | null>(null);
  const tempCounter = useRef(0);

  /** Highlights grouped by page. A page's array keeps its identity until it changes. */
  const byPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    for (const highlight of items) {
      const list = map.get(highlight.page);
      if (list) list.push(highlight);
      else map.set(highlight.page, [highlight]);
    }
    return map;
  }, [items]);
  const forPage = useCallback(
    (page: number) => byPage.get(page) ?? EMPTY,
    [byPage],
  );

  /** Saves a selection (one highlight per page). Resolves to the saved highlights, or null on failure. */
  const create = useCallback(
    async (
      parts: HighlightPart[],
      color: HighlightColor,
      note?: string,
    ): Promise<Highlight[] | null> => {
      setError(null);
      const now = new Date();
      const temps: Highlight[] = parts.map((part, index) => ({
        id: `temp-${++tempCounter.current}`,
        page: part.page,
        rects: part.rects,
        text: part.text,
        color,
        note: index === 0 && note ? note : null,
        createdAt: now,
        updatedAt: now,
      }));
      const tempIds = new Set(temps.map((t) => t.id));
      setItems((prev) => [...prev, ...temps].toSorted(readingOrder));

      const result = await actions.create({ bookId, color, note, parts });
      if (!result.ok) {
        setError(result.error);
        setItems((prev) => prev.filter((item) => !tempIds.has(item.id)));
        return null;
      }
      setItems((prev) =>
        [
          ...prev.filter((item) => !tempIds.has(item.id)),
          ...result.data.highlights,
        ].toSorted(readingOrder),
      );
      return result.data.highlights;
    },
    [actions, bookId],
  );

  const update = useCallback(
    async (
      id: string,
      patch: { color?: HighlightColor; note?: string | null },
    ) => {
      const previous = items.find((item) => item.id === id);
      if (!previous || id.startsWith("temp-")) return;
      setError(null);
      const nextNote =
        patch.note === undefined
          ? undefined
          : patch.note?.trim()
            ? patch.note.trim()
            : null;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(patch.color && { color: patch.color }),
                ...(nextNote !== undefined && { note: nextNote }),
              }
            : item,
        ),
      );

      const result = await actions.update({ id, ...patch });
      if (!result.ok) {
        setError(result.error);
        setItems((prev) =>
          prev.map((item) => (item.id === id ? previous : item)),
        );
      }
    },
    [actions, items],
  );

  const remove = useCallback(
    async (id: string) => {
      const previous = items.find((item) => item.id === id);
      if (!previous || id.startsWith("temp-")) return;
      setError(null);
      setItems((prev) => prev.filter((item) => item.id !== id));

      const result = await actions.remove(id);
      if (!result.ok) {
        setError(result.error);
        setItems((prev) => [...prev, previous].toSorted(readingOrder));
      }
    },
    [actions, items],
  );

  return {
    items,
    forPage,
    create,
    update,
    remove,
    error,
    dismissError: () => setError(null),
  };
}

export type HighlightsState = ReturnType<typeof useHighlights>;
