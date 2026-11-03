import { z } from "zod";

import { HIGHLIGHT_COLORS } from "@/shared/lib/highlight-colors";

export const MAX_RECTS_PER_HIGHLIGHT = 300;
export const MAX_HIGHLIGHT_TEXT = 5_000;
export const MAX_NOTE_LENGTH = 5_000;

const fraction = z.number().min(0).max(1);

export const normalizedRectSchema = z.object({
  x: fraction,
  y: fraction,
  w: z.number().gt(0).max(1),
  h: z.number().gt(0).max(1),
});

export const highlightColorSchema = z.enum(HIGHLIGHT_COLORS);

export const highlightPartSchema = z.object({
  page: z.number().int().min(1).max(100_000),
  text: z.string().trim().min(1).max(MAX_HIGHLIGHT_TEXT),
  rects: z.array(normalizedRectSchema).min(1).max(MAX_RECTS_PER_HIGHLIGHT),
});

/** A note: empty or whitespace-only means "no note". */
export const noteSchema = z
  .string()
  .max(MAX_NOTE_LENGTH)
  .transform((value) => (value.trim() === "" ? null : value.trim()));
