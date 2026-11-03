import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";

export function HighlightsSkeleton() {
  return (
    <LoadingRegion label="Loading highlights" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function HighlightsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 py-8">
      <HighlightsSkeleton />
    </main>
  );
}
