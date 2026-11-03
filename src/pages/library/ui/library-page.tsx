import { Suspense } from "react";

import { DeleteBookButton } from "@/features/delete-book";
import { UploadBookButton } from "@/features/upload-book";
import { BookCover, formatFileSize } from "@/entities/book";
import { getUserBooks } from "@/entities/book/server";
import { getUserShelves } from "@/entities/shelf/server";
import { requireUser } from "@/shared/auth";

async function LibraryContent() {
  const user = await requireUser("/library");
  const [books, shelves] = await Promise.all([
    getUserBooks(user.id),
    getUserShelves(user.id),
  ]);

  return (
    <>
      <section className="flex flex-wrap gap-2" aria-label="Shelves">
        {shelves.map((shelf) => (
          <span
            key={shelf.id}
            className="rounded-full border border-foreground/15 px-3 py-1 text-sm"
          >
            {shelf.name}
          </span>
        ))}
      </section>

      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
          <p className="text-foreground/70">Your library is empty.</p>
          <UploadBookButton label="Upload your first book" />
        </div>
      ) : (
        // Temporary list for Phase 2; the real grid arrives in Phase 3.
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((book) => (
            <li key={book.id} className="flex flex-col gap-2">
              <BookCover
                bookId={book.id}
                title={book.title}
                hasCover={book.hasCover}
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{book.title}</p>
                {book.author && (
                  <p className="truncate text-xs text-foreground/60">
                    {book.author}
                  </p>
                )}
                <p className="text-xs text-foreground/50">
                  {book.pageCount} pages · {formatFileSize(book.fileSize)}
                  {!book.hasTextLayer && " · scanned"}
                </p>
              </div>
              <DeleteBookButton bookId={book.id} title={book.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
        <UploadBookButton />
      </div>
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-lg bg-foreground/5" />
        }
      >
        <LibraryContent />
      </Suspense>
    </main>
  );
}
