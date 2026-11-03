import type { HighlightColor } from "@/shared/lib/highlight-colors";
import type { NormalizedRect } from "@/shared/lib/text-rects";

export type { HighlightColor, NormalizedRect };

export type Highlight = {
  id: string;
  page: number;
  /** Boxes as fractions of the page size (0–1). */
  rects: NormalizedRect[];
  text: string;
  color: HighlightColor;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};
