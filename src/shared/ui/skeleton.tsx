/** A pulsing placeholder block. Decorative; wrap groups in <LoadingRegion>. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-foreground/10 motion-reduce:animate-none ${className}`}
    />
  );
}

/** Announces a loading state to screen readers while its skeleton children are shown. */
export function LoadingRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
