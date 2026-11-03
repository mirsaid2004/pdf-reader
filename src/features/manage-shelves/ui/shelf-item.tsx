"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { libraryHref, type Shelf } from "@/entities/shelf";
import { DropdownMenu } from "@/shared/ui/dropdown-menu";

import { useToast } from "@/shared/ui/toast";

import { deleteShelf, renameShelf } from "../api/actions";

type Mode = "view" | "rename" | "confirm-delete";

type ShelfItemProps = {
  shelf: Shelf;
  active: boolean;
  q: string;
};

/** One sidebar row: link + count, with rename (all shelves) and delete (custom only). */
export function ShelfItem({ shelf, active, q }: ShelfItemProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const backToView = () => {
    setMode("view");
    setError(null);
  };

  if (mode === "rename") {
    return (
      <form
        className="flex flex-col gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          const name = String(
            new FormData(event.currentTarget).get("name") ?? "",
          );
          startTransition(async () => {
            const result = await renameShelf(shelf.id, name);
            if (!result.ok) return setError(result.error);
            backToView();
          });
        }}
      >
        <input
          name="name"
          defaultValue={shelf.name}
          autoFocus
          required
          maxLength={40}
          aria-label={`Rename ${shelf.name}`}
          disabled={pending}
          onKeyDown={(event) => event.key === "Escape" && backToView()}
          className="rounded-lg border border-foreground/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-foreground/40"
        />
        <div className="flex gap-2 text-xs">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-foreground px-2 py-1 font-medium text-background disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={backToView}
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

  if (mode === "confirm-delete") {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-red-500/30 p-2 text-xs">
        <p>Delete “{shelf.name}”? Its books stay in your library.</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteShelf(shelf.id);
                if (!result.ok) {
                  toast({
                    kind: "error",
                    title: "Couldn’t delete the shelf",
                    description: result.error,
                  });
                  return;
                }
                toast({
                  kind: "success",
                  title: "Shelf deleted",
                  description: shelf.name,
                });
                if (active) router.replace(libraryHref({ q }));
                backToView();
              })
            }
            className="rounded bg-red-600 px-2 py-1 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={backToView}
            className="px-2 py-1 text-foreground/60 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center rounded-lg ${active ? "bg-foreground/10 font-medium" : "hover:bg-foreground/5"}`}
    >
      <Link
        href={libraryHref({ shelf: shelf.id, q })}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-1.5 text-sm"
      >
        <span className="truncate">{shelf.name}</span>
        <span className="text-xs text-foreground/60">{shelf.bookCount}</span>
      </Link>
      <DropdownMenu
        label={`Options for ${shelf.name}`}
        align="left"
        triggerClassName="mr-1 flex size-6 items-center justify-center rounded text-foreground/60 hover:bg-foreground/10"
      >
        <button
          type="button"
          onClick={() => setMode("rename")}
          className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-foreground/5"
        >
          Rename
        </button>
        {shelf.kind === null && (
          <button
            type="button"
            onClick={() => setMode("confirm-delete")}
            className="block w-full rounded-lg px-3 py-1.5 text-left text-red-600 hover:bg-foreground/5"
          >
            Delete…
          </button>
        )}
      </DropdownMenu>
    </div>
  );
}
