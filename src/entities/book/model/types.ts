import type { BookOutlineItem } from "@/shared/db/schema";

export type OutlineItem = BookOutlineItem;

/** Book as exposed to UI (no storage keys). */
export type Book = {
  id: string;
  title: string;
  author: string | null;
  pageCount: number;
  fileSize: number;
  hasTextLayer: boolean;
  hasCover: boolean;
  createdAt: Date;
};
