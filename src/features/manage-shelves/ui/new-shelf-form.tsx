"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { libraryHref } from "@/entities/shelf";

import { createShelf } from "../api/actions";

export function NewShelfForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-1.5 text-left text-sm text-foreground/70 hover:bg-foreground/5"
      >
        + New shelf
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("name") ?? "",
        );
        startTransition(async () => {
          const result = await createShelf(name);
          if (!result.ok) return setError(result.error);
          setOpen(false);
          setError(null);
          router.push(libraryHref({ shelf: result.data.id }));
        });
      }}
    >
      <input
        name="name"
        autoFocus
        required
        maxLength={40}
        placeholder="Shelf name"
        aria-label="New shelf name"
        disabled={pending}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setError(null);
          }
        }}
        className="rounded-lg border border-foreground/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
      />
      <div className="flex gap-2 text-xs">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-2 py-1 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-2 py-1 text-foreground/60 hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
