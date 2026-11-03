"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastInput = {
  kind?: ToastKind;
  title: string;
  description?: string;
  /** How long it stays; errors stay longer by default. */
  durationMs?: number;
};

type ToastItem = ToastInput & { id: number; kind: ToastKind };

/** Most toasts on screen at once; older ones are dropped. */
const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 5_000;
const ERROR_DURATION_MS = 8_000;

const ToastContext = createContext<{
  toast: (input: ToastInput) => void;
} | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}

const STYLES: Record<
  ToastKind,
  { icon: string; label: string; accent: string }
> = {
  success: { icon: "✓", label: "Success", accent: "border-l-green-500" },
  error: { icon: "!", label: "Error", accent: "border-l-red-500" },
  info: { icon: "i", label: "Notice", accent: "border-l-sky-500" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback(
    (id: number) =>
      setItems((previous) => previous.filter((item) => item.id !== id)),
    [],
  );
  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    setItems((previous) =>
      [...previous, { ...input, kind: input.kind ?? "info", id }].slice(
        -MAX_VISIBLE,
      ),
    );
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext value={value}>
      {children}
      {/* Above the full-screen reader (z-50). Only the cards take pointer events. */}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const style = STYLES[item.kind];
  const duration =
    item.durationMs ??
    (item.kind === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);

  // Stays while hovered or focused so it can be read; restarts the clock afterwards.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(item.id), duration);
    return () => clearTimeout(timer);
  }, [paused, duration, item.id, onDismiss]);

  return (
    <div
      // Errors interrupt screen readers; everything else waits politely.
      role={item.kind === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-l-4 border-foreground/10 bg-background px-3 py-2.5 text-foreground shadow-lg motion-reduce:animate-none ${style.accent}`}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold"
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          <span className="sr-only">{style.label}: </span>
          {item.title}
        </p>
        {item.description && (
          <p className="mt-0.5 text-foreground/70">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="flex size-6 shrink-0 items-center justify-center rounded text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
