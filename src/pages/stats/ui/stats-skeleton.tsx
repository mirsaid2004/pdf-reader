import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";

export function StatsSkeleton() {
  return (
    <LoadingRegion label="Loading your stats" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-foreground/10 p-4"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </LoadingRegion>
  );
}

export function StatsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Reading stats</h1>
      <StatsSkeleton />
    </main>
  );
}
