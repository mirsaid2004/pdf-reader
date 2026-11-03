import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getReaderBook } from "@/entities/book/server";
import { HIGHLIGHT_STYLES, type Highlight } from "@/entities/highlight";
import { getHighlights } from "@/entities/highlight/server";
import { requireUser } from "@/shared/auth";

async function HighlightsContent({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const user = await requireUser(`/books/${bookId}/highlights`);
  const owned = await getReaderBook(user.id, bookId);
  if (!owned) notFound();
  const { book } = owned;
  const highlights = await getHighlights(user.id, bookId);

  const groups: { page: number; items: Highlight[] }[] = [];
  for (const item of highlights) {
    const last = groups.at(-1);
    if (last && last.page === item.page) last.items.push(item);
    else groups.push({ page: item.page, items: [item] });
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/library"
            className="text-sm text-foreground/60 hover:underline"
          >
            ← Library
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {book.title}
          </h1>
          {book.author && <p className="text-foreground/60">{book.author}</p>}
          <p className="mt-1 text-sm text-foreground/60">
            {highlights.length}{" "}
            {highlights.length === 1 ? "highlight" : "highlights"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/read/${book.id}`}
            className="rounded-lg border border-foreground/15 px-3 py-2 text-sm hover:bg-foreground/5"
          >
            Open book
          </Link>
          <a
            href={`/api/books/${book.id}/highlights/export`}
            download
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Export Markdown
          </a>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/20 px-6 py-16 text-center">
          <p className="font-medium">No highlights yet</p>
          <p className="mt-1 text-sm text-foreground/60">
            Open the book, select some text, and pick a colour.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-8">
          {groups.map((group) => (
            <li key={group.page}>
              <h2 className="mb-3 flex items-baseline justify-between text-sm font-medium tracking-wide text-foreground/60 uppercase">
                <span>Page {group.page}</span>
                <Link
                  href={`/read/${book.id}?page=${group.page}`}
                  className="text-xs normal-case underline underline-offset-2"
                >
                  Open at page {group.page}
                </Link>
              </h2>
              <ul className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-foreground/10 p-4"
                  >
                    <blockquote className="flex gap-3">
                      <span
                        className={`mt-1.5 h-4 w-1 shrink-0 rounded-full ${HIGHLIGHT_STYLES[item.color].swatch}`}
                        aria-label={`${HIGHLIGHT_STYLES[item.color].label} highlight`}
                      />
                      <p className="min-w-0 whitespace-pre-line">{item.text}</p>
                    </blockquote>
                    {item.note && (
                      <p className="mt-3 border-t border-foreground/10 pt-3 text-sm whitespace-pre-line text-foreground/80">
                        <span className="font-medium">Note:</span> {item.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function BookHighlightsPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 py-8">
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-2xl bg-foreground/5" />
        }
      >
        <HighlightsContent params={params} />
      </Suspense>
    </main>
  );
}
