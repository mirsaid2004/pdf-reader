import Link from "next/link";
import type { ReactNode } from "react";

import type { LibraryBook } from "../model/types";
import { BookCover } from "./book-cover";

/** Display-only card. Actions are injected through `menu` (FSD: no feature imports). */
export function BookCard({
  book,
  menu,
}: {
  book: LibraryBook;
  menu?: ReactNode;
}) {
  return (
    <article className="group relative flex flex-col gap-2">
      <Link
        href={`/read/${book.id}`}
        className="flex flex-col gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <BookCover
          bookId={book.id}
          title={book.title}
          hasCover={book.hasCover}
        />
        {book.percent !== null && (
          <div
            role="progressbar"
            aria-label="Reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(book.percent)}
            className="h-1.5 overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className="h-full bg-foreground"
              style={{ width: `${book.percent}%` }}
            />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-medium">{book.title}</h2>
          {book.author && (
            <p className="truncate text-xs text-foreground/60">{book.author}</p>
          )}
          <p className="text-xs text-foreground/60">
            {book.percent !== null ? `${Math.round(book.percent)}% · ` : ""}
            {book.pageCount} pages{!book.hasTextLayer && " · scanned"}
          </p>
        </div>
      </Link>
      {menu && <div className="absolute top-1.5 right-1.5">{menu}</div>}
    </article>
  );
}
