import { LoadingRegion, Skeleton } from "@/shared/ui/skeleton";

/** Toolbar + a blank page, in the reader's full-screen frame. */
export function ReaderSkeleton() {
  return (
    <LoadingRegion
      label="Opening book"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex h-12 items-center gap-3 border-b border-foreground/10 px-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-6" />
        <Skeleton className="hidden h-5 w-40 md:block" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="flex flex-1 justify-center overflow-hidden bg-foreground/5 px-4 pt-6">
        <Skeleton className="h-[130%] w-[min(100%,44rem)] rounded-sm bg-background/80" />
      </div>
    </LoadingRegion>
  );
}
