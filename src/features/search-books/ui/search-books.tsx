"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { libraryHref } from "@/entities/shelf";

const DEBOUNCE_MS = 300;

/** Search box that keeps the query in the URL (?q=), debounced. */
export function SearchBooks({
  initialQuery,
  shelfId,
}: {
  initialQuery: string;
  shelfId: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pushed, setPushed] = useState(initialQuery);
  const [seen, setSeen] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Adopt URL changes we didn't cause (e.g. "Clear filters").
  if (initialQuery !== seen) {
    setSeen(initialQuery);
    if (initialQuery !== pushed) {
      setValue(initialQuery);
      setPushed(initialQuery);
    }
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPushed(next.trim());
      startTransition(() => {
        router.replace(libraryHref({ shelf: shelfId, q: next }), {
          scroll: false,
        });
      });
    }, DEBOUNCE_MS);
  };

  return (
    <div role="search" className="relative w-full max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          schedule(event.target.value);
        }}
        placeholder="Search title or author"
        aria-label="Search books by title or author"
        className="w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
      {pending && (
        <span
          aria-hidden
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
        />
      )}
    </div>
  );
}
