import Link from "next/link";

import { DeleteBookButton } from "@/features/delete-book";
import { BookShelvesChecklist } from "@/features/toggle-book-shelf";
import { BookCard, type LibraryBook } from "@/entities/book";
import type { Shelf } from "@/entities/shelf";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";

export function BookGrid({
  books,
  shelves,
}: {
  books: LibraryBook[];
  shelves: Shelf[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {books.map((book) => (
        <li key={book.id}>
          <BookCard
            book={book}
            menu={
              <DropdownMenu label={`Options for ${book.title}`}>
                <BookShelvesChecklist
                  bookId={book.id}
                  shelves={shelves}
                  initialShelfIds={book.shelfIds}
                />
                <Link
                  href={`/books/${book.id}/highlights`}
                  className="mt-1 block rounded-lg px-3 py-1.5 hover:bg-foreground/5"
                >
                  My highlights
                </Link>
                <div className="mt-1 border-t border-foreground/10 px-3 pt-2">
                  <DeleteBookButton bookId={book.id} title={book.title} />
                </div>
              </DropdownMenu>
            }
          />
        </li>
      ))}
    </ul>
  );
}
