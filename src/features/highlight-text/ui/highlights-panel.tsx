"use client";

import { useState } from "react";

import {
  HIGHLIGHT_STYLES,
  MAX_NOTE_LENGTH,
  type Highlight,
} from "@/entities/highlight";

import type { HighlightsState } from "../model/use-highlights";

type HighlightsPanelProps = {
  bookId: string;
  highlights: HighlightsState;
  currentPage: number;
  onGoToPage: (page: number) => void;
};

/** The sidebar list of a book's highlights, grouped by page, with editable notes. */
export function HighlightsPanel({
  bookId,
  highlights,
  currentPage,
  onGoToPage,
}: HighlightsPanelProps) {
  const { items } = highlights;

  const groups: { page: number; items: Highlight[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.page === item.page) last.items.push(item);
    else groups.push({ page: item.page, items: [item] });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2 text-xs">
        <a
          href={`/books/${bookId}/highlights`}
          className="underline underline-offset-2"
        >
          Open full view
        </a>
        <a
          href={`/api/books/${bookId}/highlights/export`}
          download
          className="underline underline-offset-2"
        >
          Export Markdown
        </a>
      </div>

      {groups.length === 0 ? (
        <p className="p-4 text-sm text-foreground/60">
          No highlights yet. Select some text on a page and pick a colour.
        </p>
      ) : (
        <ol className="py-1">
          {groups.map((group) => (
            <li key={group.page}>
              <h2
                className={`px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase ${group.page === currentPage ? "text-foreground" : "text-foreground/60"}`}
              >
                Page {group.page}
              </h2>
              <ul>
                {group.items.map((item) => (
                  <HighlightRow
                    key={item.id}
                    highlight={item}
                    onGo={() => onGoToPage(item.page)}
                    onNote={(note) => void highlights.update(item.id, { note })}
                    onDelete={() => void highlights.remove(item.id)}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function HighlightRow(props: {
  highlight: Highlight;
  onGo: () => void;
  onNote: (note: string) => void;
  onDelete: () => void;
}) {
  const { highlight, onGo, onNote, onDelete } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(highlight.note ?? "");

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== (highlight.note ?? "")) onNote(draft);
  };

  return (
    <li className="group flex flex-col gap-1.5 border-b border-foreground/5 px-3 py-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-full ${HIGHLIGHT_STYLES[highlight.color].swatch}`}
          aria-label={`${HIGHLIGHT_STYLES[highlight.color].label} highlight`}
        />
        <button
          type="button"
          onClick={onGo}
          className="min-w-0 flex-1 text-left text-sm hover:text-foreground"
        >
          <span className="line-clamp-4">{highlight.text}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete highlight"
          className="flex size-6 shrink-0 items-center justify-center rounded text-foreground/60 hover:bg-foreground/10 hover:text-red-600"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={draft}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          aria-label="Note"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraft(highlight.note ?? "");
              setEditing(false);
            }
          }}
          className="ml-4.5 resize-none rounded-lg border border-foreground/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(highlight.note ?? "");
            setEditing(true);
          }}
          className="ml-4.5 text-left text-xs text-foreground/60 hover:text-foreground"
        >
          {highlight.note ? (
            <span className="whitespace-pre-wrap text-foreground/80">
              {highlight.note}
            </span>
          ) : (
            "Add a note…"
          )}
        </button>
      )}
    </li>
  );
}
