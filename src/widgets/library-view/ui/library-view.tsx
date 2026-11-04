"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SearchBooks } from "@/features/search-books";
import { UploadBookButton } from "@/features/upload-book";
import type { LibraryBook } from "@/entities/book";
import { filterBooks, libraryHref, type Shelf } from "@/entities/shelf";
import { BookGrid } from "@/widgets/book-grid";
import { LibrarySidebar } from "@/widgets/library-sidebar";

const URL_DEBOUNCE_MS = 300;

/**
 * The library. The server sends every book once; the selected shelf and the
 * search text are filtered here in memory, so switching shelves or typing is
 * instant. The view is still mirrored into the URL (`?shelf=&q=`) with
 * `history.replaceState`, so reload and shared links keep working.
 */
export function LibraryView({
  books,
  shelves,
  initialShelfId,
  initialQuery,
}: {
  books: LibraryBook[];
  shelves: Shelf[];
  initialShelfId: string | null;
  initialQuery: string;
}) {
  const [shelfId, setShelfId] = useState(initialShelfId);
  const [q, setQ] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // An id that isn't one of the user's shelves (deleted, or just created and
  // not delivered yet) shows all books until it appears.
  const activeShelf = shelves.find((shelf) => shelf.id === shelfId) ?? null;
  const activeShelfId = activeShelf?.id ?? null;

  const visible = useMemo(
    () => filterBooks(books, { shelfId: activeShelfId, q }),
    [books, activeShelfId, q],
  );

  const writeUrl = (next: { shelf: string | null; q: string }) => {
    window.history.replaceState(window.history.state, "", libraryHref(next));
  };

  const selectShelf = (next: string | null) => {
    setShelfId(next);
    clearTimeout(timer.current);
    writeUrl({ shelf: next, q });
  };

  const changeQuery = (next: string) => {
    setQ(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => writeUrl({ shelf: activeShelfId, q: next }),
      URL_DEBOUNCE_MS,
    );
  };

  const clearFilters = () => {
    setQ("");
    selectShelf(null);
  };

  const trimmed = q.trim();
  const filtered = activeShelfId !== null || trimmed !== "";

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <aside>
        <LibrarySidebar
          shelves={shelves}
          totalBooks={books.length}
          activeShelfId={activeShelfId}
          q={trimmed}
          onSelectShelf={selectShelf}
        />
      </aside>

      <section className="flex min-w-0 flex-col gap-6" aria-label="Books">
        {books.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <SearchBooks value={q} onChange={changeQuery} />
            <p
              className="shrink-0 text-sm text-foreground/60"
              aria-live="polite"
            >
              {visible.length} {visible.length === 1 ? "book" : "books"}
            </p>
          </div>
        )}

        {books.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
            <p className="text-lg font-medium">Your library is empty</p>
            <p className="max-w-sm text-sm text-foreground/60">
              Upload a PDF to start reading. Your progress, bookmarks, and
              highlights sync across devices.
            </p>
            <UploadBookButton label="Upload your first book" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
            {trimmed ? (
              <p className="font-medium">
                No books match “{trimmed}”
                {activeShelf && ` on ${activeShelf.name}`}.
              </p>
            ) : (
              <>
                <p className="font-medium">“{activeShelf?.name}” is empty.</p>
                <p className="max-w-sm text-sm text-foreground/60">
                  Open a book’s ⋯ menu and tick this shelf to add it.
                </p>
              </>
            )}
            {filtered && (
              <Link
                href={libraryHref({})}
                onClick={(event) => {
                  event.preventDefault();
                  clearFilters();
                }}
                className="text-sm underline underline-offset-4"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <BookGrid books={visible} shelves={shelves} />
        )}
      </section>
    </div>
  );
}
