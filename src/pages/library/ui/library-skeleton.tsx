import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";

/** Same layout as the loaded library: shelf list + search row + book grid. */
export function LibrarySkeleton() {
  return (
    <LoadingRegion
      label="Loading your library"
      className="grid gap-8 md:grid-cols-[14rem_1fr]"
    >
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-4 w-16" />
        </div>
        <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </li>
          ))}
        </ul>
      </div>
    </LoadingRegion>
  );
}

/** Whole-page version for `loading.tsx` (shows the real title straight away). */
export function LibraryLoading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <LibrarySkeleton />
    </main>
  );
}
