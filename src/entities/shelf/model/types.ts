import type { ShelfKind } from "@/shared/db/schema";

export type { ShelfKind };

export type Shelf = {
  id: string;
  name: string;
  /** Non-null for the system shelves (can be renamed, not deleted). */
  kind: ShelfKind | null;
  bookCount: number;
};
