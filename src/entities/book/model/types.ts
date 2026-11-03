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

/** A book as shown in the library grid. */
export type LibraryBook = Book & {
  /** 0–100, or null when the book hasn't been opened yet. */
  percent: number | null;
  /** Ids of the shelves this book is on. */
  shelfIds: string[];
};

/** What the reader needs to know about a book (no storage keys). */
export type ReaderBook = {
  id: string;
  title: string;
  author: string | null;
  pageCount: number;
  hasTextLayer: boolean;
};
