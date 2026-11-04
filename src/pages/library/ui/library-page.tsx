import { Suspense } from "react";

import { UploadBookButton } from "@/features/upload-book";
import { getLibraryBooks } from "@/entities/book/server";
import { getUserShelves } from "@/entities/shelf/server";
import { requireUser } from "@/shared/auth";
import { serverNow } from "@/shared/lib/server-time";
import { RefreshWhenStale } from "@/shared/ui/refresh-when-stale";
import { LibraryView } from "@/widgets/library-view";

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
  // When this page comes back from the browser's client cache it shows instantly,
  // then refreshes itself in the background if this timestamp is old.
  const renderedAt = serverNow();

  // Two independent queries, one wall-clock round trip. Everything else
  // (shelf switching, search) happens in the browser over this data.
  const [shelves, books] = await Promise.all([
    getUserShelves(user.id),
    getLibraryBooks(user.id),
  ]);

  // Only accept shelf ids that belong to this user; anything else means "all".
  const initialShelf =
    shelves.find((shelf) => shelf.id === first(params.shelf)) ?? null;

  return (
    <>
      <RefreshWhenStale renderedAt={renderedAt} />
      <LibraryView
        books={books}
        shelves={shelves}
        initialShelfId={initialShelf?.id ?? null}
        initialQuery={first(params.q).trim().slice(0, 100)}
      />
    </>
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
