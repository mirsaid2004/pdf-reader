"use client";

import { useEffect, useRef, useState } from "react";

import {
  HIGHLIGHT_STYLES,
  MAX_NOTE_LENGTH,
  type Highlight,
} from "@/entities/highlight";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@/shared/lib/highlight-colors";

import type { ViewportBox } from "../lib/selection";

type HighlightPopoverProps = {
  highlight: Highlight;
  anchor: ViewportBox;
  autoFocusNote: boolean;
  onClose: () => void;
  onColor: (color: HighlightColor) => void;
  onNote: (note: string) => void;
  onDelete: () => void;
};

const WIDTH = 288;
const MARGIN = 8;
const TOOLBAR_HEIGHT = 48;

/** Edit a highlight: colour, note, delete. Opens next to the highlight. */
export function HighlightPopover(props: HighlightPopoverProps) {
  const {
    highlight,
    anchor,
    autoFocusNote,
    onClose,
    onColor,
    onNote,
    onDelete,
  } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(highlight.note ?? "");

  const saveNote = () => {
    if (draft.trim() !== (highlight.note ?? "")) onNote(draft);
  };

  useEffect(() => {
    if (autoFocusNote) noteRef.current?.focus();
  }, [autoFocusNote]);

  // Close on outside click or Escape (saving the note first).
  const latest = useRef({ saveNote, onClose });
  useEffect(() => {
    latest.current = { saveNote, onClose };
  });
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      latest.current.saveNote();
      latest.current.onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      latest.current.saveNote();
      latest.current.onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  const left = Math.min(
    Math.max((anchor.left + anchor.right) / 2 - WIDTH / 2, MARGIN),
    window.innerWidth - WIDTH - MARGIN,
  );
  const below = anchor.bottom + MARGIN;
  const fitsBelow = below + 230 < window.innerHeight;
  const top = fitsBelow
    ? below
    : Math.max(anchor.top - 230 - MARGIN, TOOLBAR_HEIGHT + MARGIN);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Highlight"
      style={{ left, top, width: WIDTH }}
      className="fixed z-30 flex flex-col gap-3 rounded-xl border border-foreground/15 bg-background p-3 text-sm text-foreground shadow-xl"
    >
      <p className="line-clamp-2 text-xs text-foreground/60">
        “{highlight.text}”
      </p>

      <div
        role="radiogroup"
        aria-label="Colour"
        className="flex items-center gap-2"
      >
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={highlight.color === color}
            aria-label={HIGHLIGHT_STYLES[color].label}
            onClick={() => onColor(color)}
            className={`size-6 rounded-full ${HIGHLIGHT_STYLES[color].swatch} ring-1 ring-black/10 ${
              highlight.color === color
                ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                : ""
            }`}
          />
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-foreground/60">Note</span>
        <textarea
          ref={noteRef}
          value={draft}
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Add a note…"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveNote}
          className="resize-none rounded-lg border border-foreground/15 bg-transparent px-2 py-1.5 outline-none focus:border-foreground/40"
        />
      </label>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-600 hover:underline"
        >
          Delete highlight
        </button>
        <button
          type="button"
          onClick={() => {
            saveNote();
            onClose();
          }}
          className="rounded-lg bg-foreground px-3 py-1 text-xs font-medium text-background"
        >
          Done
        </button>
      </div>
    </div>
  );
}
