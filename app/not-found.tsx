import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-foreground/70">
        That page doesn’t exist, or it was moved.
      </p>
      <Link
        href="/library"
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        Go to your library
      </Link>
    </main>
  );
}
