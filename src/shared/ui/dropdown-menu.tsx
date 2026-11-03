"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type DropdownMenuProps = {
  /** Accessible name for the trigger button. */
  label: string;
  children: ReactNode;
  align?: "left" | "right";
  triggerClassName?: string;
};

/** Small click-to-open menu: closes on outside click and Escape. */
export function DropdownMenu({
  label,
  children,
  align = "right",
  triggerClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={
          triggerClassName ??
          "flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow ring-1 ring-foreground/10 hover:bg-background"
        }
      >
        <span aria-hidden>⋯</span>
      </button>
      {open && (
        <div
          id={panelId}
          className={`absolute top-full z-20 mt-1 min-w-48 rounded-xl border border-foreground/10 bg-background p-2 text-sm text-foreground shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
