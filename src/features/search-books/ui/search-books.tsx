"use client";

/**
 * Controlled search box. Filtering happens in memory in the library view, so
 * results update on every keystroke with no server request.
 */
export function SearchBooks({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="search" className="relative w-full max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search title or author"
        aria-label="Search books by title or author"
        className="w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
    </div>
  );
}
