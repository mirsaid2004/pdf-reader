"use client";

import Link from "next/link";
import { useState } from "react";

import { READER_THEMES, THEME_STYLES, type ReaderTheme } from "../model/themes";

type ToolbarProps = {
  visible: boolean;
  title: string;
  currentPage: number;
  pageCount: number;
  onGoToPage: (page: number) => void;
  zoomPercent: number;
  isFit: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  theme: ReaderTheme;
  onThemeChange: (theme: ReaderTheme) => void;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onInteract: () => void;
  sidebarTab: "contents" | "search" | "bookmarks" | "highlights" | null;
  onToggleContents: () => void;
  onToggleSearch: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
};

const iconButton =
  "flex size-9 items-center justify-center rounded-lg text-lg hover:bg-foreground/10 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2";

export function Toolbar(props: ToolbarProps) {
  const {
    visible,
    title,
    currentPage,
    pageCount,
    onGoToPage,
    zoomPercent,
    isFit,
    canZoomIn,
    canZoomOut,
    onZoomIn,
    onZoomOut,
    onFitWidth,
    theme,
    onThemeChange,
    fullscreenSupported,
    isFullscreen,
    onToggleFullscreen,
    onInteract,
    sidebarTab,
    onToggleContents,
    onToggleSearch,
    bookmarked,
    onToggleBookmark,
  } = props;
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    const page = Number.parseInt(draft ?? "", 10);
    if (Number.isFinite(page))
      onGoToPage(Math.min(Math.max(page, 1), pageCount));
    setDraft(null);
  };

  return (
    <div
      // `inert` keeps hidden controls out of the tab order and screen readers.
      inert={!visible}
      onFocusCapture={onInteract}
      className={`absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-1 border-b border-foreground/10 bg-background/95 px-2 text-foreground shadow-sm backdrop-blur transition-[transform,opacity] duration-200 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <Link
        href="/library"
        className={`${iconButton} w-auto gap-1 px-2 text-sm`}
        aria-label="Back to library"
      >
        <span aria-hidden>←</span>
        <span className="hidden sm:inline">Library</span>
      </Link>

      <button
        type="button"
        className={`${iconButton} ${sidebarTab === "contents" ? "bg-foreground/10" : ""}`}
        aria-label="Table of contents"
        title="Table of contents (t)"
        aria-pressed={sidebarTab === "contents"}
        onClick={onToggleContents}
      >
        <span aria-hidden>☰</span>
      </button>
      <button
        type="button"
        className={`${iconButton} ${sidebarTab === "search" ? "bg-foreground/10" : ""}`}
        aria-label="Search in book"
        title="Search in book (/ or Ctrl+F)"
        aria-pressed={sidebarTab === "search"}
        onClick={onToggleSearch}
      >
        <span aria-hidden>⌕</span>
      </button>
      <button
        type="button"
        className={`${iconButton} ${bookmarked ? "bg-foreground/10" : ""}`}
        aria-label={
          bookmarked ? "Remove bookmark from this page" : "Bookmark this page"
        }
        title={bookmarked ? "Remove bookmark (b)" : "Bookmark this page (b)"}
        aria-pressed={bookmarked}
        onClick={onToggleBookmark}
      >
        <span aria-hidden>{bookmarked ? "★" : "☆"}</span>
      </button>

      <h1 className="mx-2 hidden min-w-0 flex-1 truncate text-sm font-medium md:block">
        {title}
      </h1>
      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={iconButton}
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onGoToPage(currentPage - 1)}
        >
          ‹
        </button>
        <label className="flex items-center gap-1 text-sm tabular-nums">
          <span className="sr-only">Page</span>
          <input
            inputMode="numeric"
            value={draft ?? String(currentPage)}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) =>
              setDraft(event.target.value.replace(/\D/g, ""))
            }
            onBlur={() => setDraft(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDraft();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setDraft(null);
                event.currentTarget.blur();
              }
            }}
            className="w-12 rounded-md border border-foreground/15 bg-transparent px-1 py-1 text-center outline-none focus:border-foreground/40"
          />
          <span className="whitespace-nowrap text-foreground/60">
            / {pageCount}
          </span>
        </label>
        <button
          type="button"
          className={iconButton}
          aria-label="Next page"
          disabled={currentPage >= pageCount}
          onClick={() => onGoToPage(currentPage + 1)}
        >
          ›
        </button>
      </div>

      <div className="ml-1 flex items-center gap-0.5">
        <button
          type="button"
          className={`${iconButton} hidden sm:flex`}
          aria-label="Zoom out"
          disabled={!canZoomOut}
          onClick={onZoomOut}
        >
          −
        </button>
        <span
          className="hidden w-11 text-center text-xs text-foreground/60 tabular-nums sm:inline"
          aria-live="polite"
        >
          {zoomPercent}%
        </span>
        <button
          type="button"
          className={`${iconButton} hidden sm:flex`}
          aria-label="Zoom in"
          disabled={!canZoomIn}
          onClick={onZoomIn}
        >
          +
        </button>
        <button
          type="button"
          onClick={onFitWidth}
          aria-pressed={isFit}
          className={`${iconButton} w-auto px-2 text-xs ${isFit ? "bg-foreground/10" : ""}`}
        >
          Fit
        </button>
      </div>

      <div
        role="radiogroup"
        aria-label="Page theme"
        className="ml-1 flex items-center gap-1 px-1"
      >
        {READER_THEMES.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={theme === name}
            aria-label={`${THEME_STYLES[name].label} theme`}
            title={`${THEME_STYLES[name].label} theme`}
            onClick={() => onThemeChange(name)}
            style={{ background: THEME_STYLES[name].swatch }}
            className={`size-5 rounded-full border border-foreground/30 ${
              theme === name
                ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                : ""
            }`}
          />
        ))}
      </div>

      {fullscreenSupported && (
        <button
          type="button"
          className={`${iconButton} hidden sm:flex`}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
          onClick={onToggleFullscreen}
        >
          <span aria-hidden>{isFullscreen ? "⤡" : "⤢"}</span>
        </button>
      )}
    </div>
  );
}
