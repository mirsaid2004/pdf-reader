import { Suspense } from "react";

import { getUserShelves } from "@/entities/shelf/server";
import { requireUser } from "@/shared/auth";

async function LibraryContent() {
  const user = await requireUser("/library");
  const shelves = await getUserShelves(user.id);

  return (
    <>
      <p className="text-foreground/70">
        Signed in as {user.name ?? user.email}. Uploads arrive in the next
        phase.
      </p>
      <section>
        <h2 className="mb-2 text-sm font-medium tracking-wide text-foreground/60 uppercase">
          Shelves
        </h2>
        <ul className="flex flex-wrap gap-2">
          {shelves.map((shelf) => (
            <li
              key={shelf.id}
              className="rounded-full border border-foreground/15 px-3 py-1 text-sm"
            >
              {shelf.name}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-lg bg-foreground/5" />
        }
      >
        <LibraryContent />
      </Suspense>
    </main>
  );
}
