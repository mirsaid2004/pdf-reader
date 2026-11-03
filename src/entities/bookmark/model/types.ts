export type Bookmark = {
  id: string;
  page: number;
  /** Optional name; the UI falls back to "Page N". */
  label: string | null;
  createdAt: Date;
};
