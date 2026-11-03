import Link from "next/link";
import { Suspense } from "react";

import { SearchBooks } from "@/features/search-books";
import { UploadBookButton } from "@/features/upload-book";
import { countUserBooks, getLibraryBooks } from "@/entities/book/server";
import { libraryHref } from "@/entities/shelf";
import { getUserShelves } from "@/entities/shelf/server";
import { requireUser } from "@/shared/auth";
import { BookGrid } from "@/widgets/book-grid";
import { LibrarySidebar } from "@/widgets/library-sidebar";

import { LibrarySkeleton } from "./library-skeleton";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

async function LibraryContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await requireUser("/library");

  const q = first(params.q).trim().slice(0, 100);
  const [shelves, totalBooks] = await Promise.all([
    getUserShelves(user.id),
    countUserBooks(user.id),
  ]);

  // Only accept shelf ids that belong to this user; anything else means "all".
  const activeShelf =
    shelves.find((shelf) => shelf.id === first(params.shelf)) ?? null;
  const books = await getLibraryBooks({
    userId: user.id,
    shelfId: activeShelf?.id ?? null,
    q,
  });

  const filtered = Boolean(activeShelf) || q !== "";

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <aside>
        <LibrarySidebar
          shelves={shelves}
          totalBooks={totalBooks}
          activeShelfId={activeShelf?.id ?? null}
          q={q}
        />
      </aside>

      <section className="flex min-w-0 flex-col gap-6" aria-label="Books">
        {totalBooks > 0 && (
          <div className="flex items-center justify-between gap-4">
            <SearchBooks initialQuery={q} shelfId={activeShelf?.id ?? null} />
            <p
              className="shrink-0 text-sm text-foreground/60"
              aria-live="polite"
            >
              {books.length} {books.length === 1 ? "book" : "books"}
            </p>
          </div>
        )}

        {totalBooks === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
            <p className="text-lg font-medium">Your library is empty</p>
            <p className="max-w-sm text-sm text-foreground/60">
              Upload a PDF to start reading. Your progress, bookmarks, and
              highlights sync across devices.
            </p>
            <UploadBookButton label="Upload your first book" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
            {q ? (
              <p className="font-medium">
                No books match “{q}”{activeShelf && ` on ${activeShelf.name}`}.
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
                className="text-sm underline underline-offset-4"
              >
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <BookGrid books={books} shelves={shelves} />
        )}
      </section>
    </div>
  );
}

export function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
        <UploadBookButton />
      </div>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
