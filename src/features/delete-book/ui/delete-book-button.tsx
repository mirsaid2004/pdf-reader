"use client";

import { useState, useTransition } from "react";

import { useToast } from "@/shared/ui/toast";

import { deleteBook } from "../api/actions";

export function DeleteBookButton({
  bookId,
  title,
}: {
  bookId: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-foreground/50 hover:text-red-600"
        aria-label={`Delete ${title}`}
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <span>Delete permanently?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteBook(bookId);
            if (result.ok)
              toast({
                kind: "success",
                title: "Book deleted",
                description: title,
              });
            else
              toast({
                kind: "error",
                title: "Couldn’t delete the book",
                description: result.error,
              });
          })
        }
        className="rounded bg-red-600 px-2 py-0.5 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setConfirming(false);
        }}
        className="text-foreground/60 hover:underline"
      >
        Cancel
      </button>
    </span>
  );
}
