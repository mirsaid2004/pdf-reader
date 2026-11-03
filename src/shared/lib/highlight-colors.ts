/** The highlight palette. A plain list (no DB imports) so the browser can use it too. */
export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";
