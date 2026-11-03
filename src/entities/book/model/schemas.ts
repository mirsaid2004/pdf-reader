import { z } from "zod";

import type { OutlineItem } from "./types";

export const MAX_OUTLINE_ITEMS = 2000;
export const MAX_OUTLINE_DEPTH = 8;

export const outlineItemSchema: z.ZodType<OutlineItem> = z.object({
  title: z.string().max(500),
  page: z.number().int().positive().nullable(),
  get items() {
    return z.array(outlineItemSchema);
  },
});

export const outlineSchema = z
  .array(outlineItemSchema)
  .refine((items) => countOutline(items) <= MAX_OUTLINE_ITEMS, {
    message: `Outline has more than ${MAX_OUTLINE_ITEMS} entries`,
  });

export function countOutline(items: OutlineItem[]): number {
  return items.reduce((sum, item) => sum + 1 + countOutline(item.items), 0);
}

export const bookIdSchema = z.uuid();
