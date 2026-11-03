import type { HighlightColor } from "../model/types";

/** Tailwind classes per colour: page overlay fill, and a solid swatch for buttons/chips. */
export const HIGHLIGHT_STYLES: Record<
  HighlightColor,
  { overlay: string; swatch: string; label: string }
> = {
  yellow: {
    overlay: "bg-yellow-300/50",
    swatch: "bg-yellow-300",
    label: "Yellow",
  },
  green: { overlay: "bg-green-400/40", swatch: "bg-green-400", label: "Green" },
  blue: { overlay: "bg-sky-400/40", swatch: "bg-sky-400", label: "Blue" },
  pink: { overlay: "bg-pink-400/40", swatch: "bg-pink-400", label: "Pink" },
};
