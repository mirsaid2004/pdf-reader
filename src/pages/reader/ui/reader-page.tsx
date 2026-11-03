import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { createReadUrl } from "@/features/read-book/server";
import { getReaderBook } from "@/entities/book/server";
import { getSavedPage } from "@/entities/reading-progress/server";
import { requireUser } from "@/shared/auth";
import { PdfReader } from "@/widgets/pdf-reader";

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

  const result = await getReaderBook(user.id, bookId);
  if (!result) notFound();

  const [url, savedPage] = await Promise.all([
    createReadUrl(result.fileKey),
    getSavedPage(user.id, bookId),
  ]);

  // Resume order: an explicit ?page=N, then the saved page, then page 1.
  const { pageCount } = result.book;
  const initialPage =
    parsePage(query.page, pageCount) ??
    (savedPage ? Math.min(Math.max(savedPage, 1), pageCount) : 1);

  return (
    <PdfReader book={result.book} initialUrl={url} initialPage={initialPage} />
  );
}

export function ReaderPage(props: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <span className="size-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        </div>
      }
    >
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
