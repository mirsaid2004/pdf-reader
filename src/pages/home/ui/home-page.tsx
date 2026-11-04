import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/shared/ui/logo";

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Pick up where you left off",
    text: "Your page, progress and shelves follow you across every device.",
    icon: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2" />,
  },
  {
    title: "Highlights & notes",
    text: "Mark passages in four colours, add notes, and export them to Markdown.",
    icon: <path d="m4 20 4-1 10-10-3-3L5 16zM13 7l3 3" />,
  },
  {
    title: "Contents & search",
    text: "Jump through the outline or search the whole book instantly.",
    icon: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4" />,
  },
  {
    title: "Reading stats",
    text: "Daily pages, streaks and finished books, in your own time zone.",
    icon: <path d="M5 20V10m7 10V4m7 16v-7" />,
  },
];

/** Decorative reader preview (pure HTML/CSS). */
function ReaderPreview() {
  const line = "h-2 rounded-full bg-foreground/10";
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-xl rounded-2xl border border-foreground/10 bg-background/70 p-3 shadow-2xl shadow-accent/20 backdrop-blur"
    >
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="ml-3 h-2 w-24 rounded-full bg-foreground/10" />
      </div>
      <div className="grid grid-cols-[7rem_1fr] gap-3">
        <div className="hidden flex-col gap-2 rounded-lg bg-foreground/5 p-3 sm:flex">
          <span className="h-2 w-16 rounded-full bg-accent/60" />
          <span className={`${line} w-20`} />
          <span className={`${line} w-14`} />
          <span className={`${line} w-[4.5rem]`} />
          <span className={`${line} w-12`} />
        </div>
        <div className="col-span-2 flex flex-col gap-2.5 rounded-lg bg-white p-6 shadow-inner sm:col-span-1 dark:bg-neutral-900">
          <span className="mb-2 h-3 w-1/2 rounded-full bg-foreground/20" />
          <span className={`${line} w-full`} />
          <span className={`${line} w-[92%]`} />
          <span className="h-2 w-[70%] rounded-full bg-amber-300/80" />
          <span className="h-2 w-[85%] rounded-full bg-amber-300/80" />
          <span className={`${line} w-full`} />
          <span className={`${line} w-[88%]`} />
          <span className={`${line} w-3/5`} />
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full w-2/5 rounded-full bg-linear-to-r from-accent to-accent-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Soft background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-64 -right-24 size-80 rounded-full bg-accent-2/15 blur-3xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-4 pt-16 pb-12 text-center sm:pt-24">
        <div className="flex flex-col items-center gap-6">
          <LogoMark className="size-16 drop-shadow-lg" />
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Read every book,{" "}
            <span className="bg-linear-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              remember every page
            </span>
          </h1>
          <p className="max-w-xl text-lg text-balance text-foreground/70">
            MDEV-Reader is your private PDF library. Upload your books, read
            them in the browser, and keep progress, bookmarks and highlights in
            sync across devices.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/library"
              className="rounded-xl bg-linear-to-r from-accent to-accent-2 px-6 py-3 font-medium text-white shadow-lg shadow-accent/30 transition hover:brightness-110"
            >
              Open my library
            </Link>
            <a
              href="#features"
              className="rounded-xl border border-foreground/15 px-6 py-3 font-medium hover:bg-foreground/5"
            >
              See what’s inside
            </a>
          </div>
        </div>
        <ReaderPreview />
      </section>

      <section
        id="features"
        className="relative mx-auto grid w-full max-w-6xl gap-4 px-4 pt-8 pb-24 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-foreground/10 bg-background/60 p-5 backdrop-blur"
          >
            <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {feature.icon}
              </svg>
            </span>
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-1 text-sm text-foreground/60">{feature.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
