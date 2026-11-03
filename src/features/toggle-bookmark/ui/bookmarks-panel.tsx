"use client";

import { useState } from "react";

import type { BookmarksState } from "../model/use-bookmarks";

type BookmarksPanelProps = {
  bookmarks: BookmarksState;
  currentPage: number;
  onGoToPage: (page: number) => void;
};

export function BookmarksPanel({
  bookmarks,
  currentPage,
  onGoToPage,
}: BookmarksPanelProps) {
  const { items, error } = bookmarks;

  return (
    <div className="flex flex-col">
      {error && (
        <p
          role="alert"
          className="m-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="p-4 text-sm text-foreground/60">
          No bookmarks yet. Press{" "}
          <kbd className="rounded border border-foreground/20 px-1 text-xs">
            b
          </kbd>{" "}
          or use the bookmark button in the toolbar to mark page {currentPage}.
        </p>
      ) : (
        <ul className="py-1">
          {items.map((item) => (
            <BookmarkRow
              key={item.id}
              page={item.page}
              label={item.label}
              current={item.page === currentPage}
              onGo={() => onGoToPage(item.page)}
              onLabel={(label) => void bookmarks.setLabel(item.id, label)}
              onRemove={() => void bookmarks.remove(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookmarkRow(props: {
  page: number;
  label: string | null;
  current: boolean;
  onGo: () => void;
  onLabel: (label: string) => void;
  onRemove: () => void;
}) {
  const { page, label, current, onGo, onLabel, onRemove } = props;
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <li
      className={`flex items-center gap-1 px-2 py-1 ${current ? "bg-foreground/10" : ""}`}
    >
      <button
        type="button"
        onClick={onGo}
        className="w-14 shrink-0 rounded px-1 py-1.5 text-left text-sm font-medium tabular-nums hover:bg-foreground/10"
        aria-label={`Go to page ${page}`}
      >
        p. {page}
      </button>
      <input
        value={draft ?? label ?? ""}
        placeholder="Add a label"
        aria-label={`Label for the bookmark on page ${page}`}
        maxLength={200}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) onLabel(draft);
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          else if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-sm outline-none placeholder:text-foreground/40 hover:border-foreground/15 focus:border-foreground/40"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove the bookmark on page ${page}`}
        className="flex size-7 shrink-0 items-center justify-center rounded text-foreground/50 hover:bg-foreground/10 hover:text-red-600"
      >
        <span aria-hidden>×</span>
      </button>
    </li>
  );
}
