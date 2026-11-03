import Link from "next/link";

import { NewShelfForm, ShelfItem } from "@/features/manage-shelves";
import { libraryHref, type Shelf } from "@/entities/shelf";

type Props = {
  shelves: Shelf[];
  totalBooks: number;
  /** Currently selected shelf id, or null for "All books". */
  activeShelfId: string | null;
  q: string;
};

export function LibrarySidebar({
  shelves,
  totalBooks,
  activeShelfId,
  q,
}: Props) {
  const allActive = activeShelfId === null;
  return (
    <nav aria-label="Shelves" className="flex flex-col gap-1">
      <Link
        href={libraryHref({ q })}
        aria-current={allActive ? "page" : undefined}
        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm ${
          allActive ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"
        }`}
      >
        <span>All books</span>
        <span className="text-xs text-foreground/60">{totalBooks}</span>
      </Link>
      {shelves.map((shelf) => (
        <ShelfItem
          key={shelf.id}
          shelf={shelf}
          active={shelf.id === activeShelfId}
          q={q}
        />
      ))}
      <NewShelfForm />
    </nav>
  );
}
