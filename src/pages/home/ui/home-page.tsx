import Link from "next/link";

export function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">PDF Reader</h1>
      <p className="max-w-md text-balance text-foreground/70">
        Upload your PDF books, read them in the browser, and keep your progress,
        bookmarks, and highlights in sync across devices.
      </p>
      <Link
        href="/library"
        className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90"
      >
        Open my library
      </Link>
    </main>
  );
}
