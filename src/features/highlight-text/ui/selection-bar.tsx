"use client";

import { HIGHLIGHT_STYLES } from "@/entities/highlight";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@/shared/lib/highlight-colors";

import type { CapturedSelection } from "../lib/selection";

type SelectionBarProps = {
  selection: CapturedSelection;
  /** Touch devices show the bar at the bottom of the screen (native selection menus use the top). */
  touch: boolean;
  onHighlight: (color: HighlightColor) => void;
  onAddNote: () => void;
};

const BAR_WIDTH = 252;
const BAR_HEIGHT = 40;
const TOOLBAR_HEIGHT = 48;

/** The colour picker that appears next to selected text. */
export function SelectionBar({
  selection,
  touch,
  onHighlight,
  onAddNote,
}: SelectionBarProps) {
  const { anchor } = selection;

  let style: React.CSSProperties;
  if (touch) {
    style = { left: "50%", bottom: 16, transform: "translateX(-50%)" };
  } else {
    const centre = (anchor.left + anchor.right) / 2;
    const left = Math.min(
      Math.max(centre - BAR_WIDTH / 2, 8),
      window.innerWidth - BAR_WIDTH - 8,
    );
    // Above the selection if there's room under the toolbar, otherwise below it.
    const above = anchor.top - BAR_HEIGHT - 8;
    const top = above >= TOOLBAR_HEIGHT + 4 ? above : anchor.bottom + 8;
    style = { left, top };
  }

  return (
    <div
      role="toolbar"
      aria-label="Highlight selected text"
      style={style}
      // Keep the text selected while pressing the buttons.
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-30 flex items-center gap-1 rounded-full border border-foreground/15 bg-background/95 px-2 py-1 text-foreground shadow-lg backdrop-blur"
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Highlight in ${HIGHLIGHT_STYLES[color].label.toLowerCase()}`}
          title={`${HIGHLIGHT_STYLES[color].label} highlight`}
          onClick={() => onHighlight(color)}
          className={`size-7 rounded-full ${HIGHLIGHT_STYLES[color].swatch} ring-1 ring-black/10 hover:ring-2 hover:ring-foreground/50`}
        />
      ))}
      <span className="mx-1 h-5 w-px bg-foreground/15" aria-hidden />
      <button
        type="button"
        onClick={onAddNote}
        className="rounded-full px-2 py-1 text-xs font-medium hover:bg-foreground/10"
      >
        Note
      </button>
    </div>
  );
}
