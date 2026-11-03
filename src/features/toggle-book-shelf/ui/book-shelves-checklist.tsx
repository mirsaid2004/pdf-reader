"use client";

import { useState, useTransition } from "react";

import type { Shelf } from "@/entities/shelf";

import { useToast } from "@/shared/ui/toast";

import { setBookShelf } from "../api/actions";

type Props = {
  bookId: string;
  shelves: Pick<Shelf, "id" | "name" | "kind">[];
  initialShelfIds: string[];
};

export function BookShelvesChecklist({
  bookId,
  shelves,
  initialShelfIds,
}: Props) {
  const [selected, setSelected] = useState(() => new Set(initialShelfIds));
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const toggle = (shelfId: string, on: boolean) => {
    startTransition(async () => {
      const result = await setBookShelf({ bookId, shelfId, on });
      if (result.ok) setSelected(new Set(result.data.shelfIds));
      else
        toast({
          kind: "error",
          title: "Couldn’t update shelves",
          description: result.error,
        });
    });
  };

  return (
    <fieldset disabled={pending} className="flex flex-col gap-0.5">
      <legend className="px-3 pb-1 text-xs font-medium text-foreground/50">
        Shelves
      </legend>
      {shelves.map((shelf) => (
        <label
          key={shelf.id}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-foreground/5"
        >
          <input
            type="checkbox"
            checked={selected.has(shelf.id)}
            onChange={(event) => toggle(shelf.id, event.target.checked)}
          />
          <span className="truncate">{shelf.name}</span>
        </label>
      ))}
    </fieldset>
  );
}
