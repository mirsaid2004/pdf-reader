import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { createReadUrl } from "@/features/read-book/server";
import { bookIdSchema } from "@/entities/book";
import { getReaderBook } from "@/entities/book/server";
import { getBookmarks } from "@/entities/bookmark/server";
import { getHighlights } from "@/entities/highlight/server";
import { getSavedPage } from "@/entities/reading-progress/server";
import { requireUser } from "@/shared/auth";
import { serverNow } from "@/shared/lib/server-time";
import { PdfReader, ReaderSkeleton } from "@/widgets/pdf-reader";

type SearchParams = Record<string, string | string[] | undefined>;

/** An explicit, valid ?page=N, or null. */
function parsePage(
  raw: string | string[] | undefined,
  pageCount: number,
): number | null {
  const value = Number.parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "", 10);
  return Number.isFinite(value)
    ? Math.min(Math.max(value, 1), pageCount)
    : null;
}

async function ReaderContent({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ bookId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/read/${bookId}`);

  // Malformed ids would make Postgres reject the uuid, so 404 before querying.
  if (!bookIdSchema.safeParse(bookId).success) notFound();

  // One wall-clock round trip: these queries are independent, and each is
  // scoped to `user.id`, so they can run alongside the ownership check. If the
  // book isn't the user's we 404 and discard whatever came back.
  const [result, savedPage, bookmarks, highlights] = await Promise.all([
    getReaderBook(user.id, bookId),
    getSavedPage(user.id, bookId),
    getBookmarks(user.id, bookId),
    getHighlights(user.id, bookId),
  ]);
  if (!result) notFound();
  // Presigning is local crypto (no network).
  const url = await createReadUrl(result.fileKey);

  // Resume order: an explicit ?page=N, then the saved page, then page 1.
  const { pageCount } = result.book;
  const initialPage =
    parsePage(query.page, pageCount) ??
    (savedPage ? Math.min(Math.max(savedPage, 1), pageCount) : 1);

  // Lets the client detect a copy from the browser's cache and re-fetch it
  // (a stale saved page or highlight list must never be the starting point).
  const renderedAt = serverNow();

  return (
    <PdfReader
      book={result.book}
      outline={result.outline}
      bookmarks={bookmarks}
      highlights={highlights}
      initialUrl={url}
      initialPage={initialPage}
      renderedAt={renderedAt}
    />
  );
}

export function ReaderPage(props: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<ReaderSkeleton />}>
      <ReaderContent {...props} />
    </Suspense>
  );
}

export function ReaderNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Book not found</h1>
      <p className="max-w-sm text-foreground/60">
        It may have been deleted, or it isn’t in your library.
      </p>
      <Link
        href="/library"
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Back to library
      </Link>
    </main>
  );
}
