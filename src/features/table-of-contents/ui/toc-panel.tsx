"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { OutlineItem } from "@/entities/book";

import {
  ancestorIds,
  findCurrentSectionId,
  flattenOutline,
} from "../lib/outline";

type TocPanelProps = {
  outline: OutlineItem[] | null;
  currentPage: number;
  onGoToPage: (page: number) => void;
  /** Whether the panel is on screen (it stays mounted to keep its state). */
  visible: boolean;
};

/** Expandable table of contents; follows the reader's current section. */
export function TocPanel({
  outline,
  currentPage,
  onGoToPage,
  visible,
}: TocPanelProps) {
  const flat = useMemo(() => flattenOutline(outline ?? []), [outline]);
  const currentId = useMemo(
    () => findCurrentSectionId(flat, currentPage),
    [flat, currentPage],
  );
  // The reader's own open/close choices; everything else follows the current section.
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  );
  const listRef = useRef<HTMLUListElement>(null);

  const forcedOpen = useMemo(
    () => new Set(currentId === null ? [] : ancestorIds(flat, currentId)),
    [flat, currentId],
  );
  const isExpanded = (id: string) => overrides.get(id) ?? forcedOpen.has(id);

  // Pre-order list: an entry is shown when its parent is shown and expanded.
  const shown = new Set<string>();
  const visibleItems = flat.filter((item) => {
    const show =
      item.parentId === null ||
      (shown.has(item.parentId) && isExpanded(item.parentId));
    if (show) shown.add(item.id);
    return show;
  });

  useEffect(() => {
    if (!visible) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-current="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [visible, currentId]);

  if (flat.length === 0) {
    return (
      <p className="p-4 text-sm text-foreground/60">
        This book has no table of contents. Use the page box in the toolbar, or
        search, to find your way around.
      </p>
    );
  }

  return (
    <ul ref={listRef} className="flex flex-col py-2 text-sm">
      {visibleItems.map((item) => {
        const current = item.id === currentId;
        const expanded = isExpanded(item.id);
        return (
          <li
            key={item.id}
            data-current={current ? "true" : undefined}
            className={`flex items-start ${current ? "bg-foreground/10" : ""}`}
            style={{ paddingLeft: 8 + item.depth * 14 }}
          >
            {item.hasChildren ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`}
                onClick={() =>
                  setOverrides((prev) => new Map(prev).set(item.id, !expanded))
                }
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded text-foreground/60 hover:bg-foreground/10"
              >
                <span aria-hidden>{expanded ? "▾" : "▸"}</span>
              </button>
            ) : (
              <span className="size-6 shrink-0" aria-hidden />
            )}
            {item.page === null ? (
              <span className="min-w-0 flex-1 py-1.5 pr-3 text-foreground/45">
                {item.title}
              </span>
            ) : (
              <button
                type="button"
                aria-current={current ? "location" : undefined}
                onClick={() => onGoToPage(item.page ?? 1)}
                className="flex min-w-0 flex-1 items-baseline justify-between gap-3 py-1.5 pr-3 text-left hover:text-foreground"
              >
                <span className={`min-w-0 ${current ? "font-medium" : ""}`}>
                  {item.title}
                </span>
                <span className="shrink-0 text-xs text-foreground/50 tabular-nums">
                  {item.page}
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
