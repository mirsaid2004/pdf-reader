"use client";

import type { OutlineItem } from "@/entities/book";
import {
  HighlightsPanel,
  type HighlightsState,
} from "@/features/highlight-text";
import { SearchPanel, type BookSearch } from "@/features/search-book";
import { TocPanel } from "@/features/table-of-contents";
import {
  BookmarksPanel,
  type BookmarksState,
} from "@/features/toggle-bookmark";

export type SidebarTab = "contents" | "search" | "bookmarks" | "highlights";

type ReaderSidebarProps = {
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  /** Docked beside the page (wide screens) or an overlay drawer (narrow ones). */
  docked: boolean;
  outline: OutlineItem[] | null;
  currentPage: number;
  onGoToPage: (page: number) => void;
  hasTextLayer: boolean;
  search: BookSearch;
  searchFocusSignal: number;
  bookId: string;
  bookmarks: BookmarksState;
  highlights: HighlightsState;
};

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "contents", label: "Contents" },
  { id: "search", label: "Search" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "highlights", label: "Highlights" },
];

export function ReaderSidebar(props: ReaderSidebarProps) {
  const {
    tab,
    onTabChange,
    onClose,
    docked,
    outline,
    currentPage,
    onGoToPage,
    hasTextLayer,
    search,
    searchFocusSignal,
    bookId,
    bookmarks,
    highlights,
  } = props;

  return (
    <>
      {!docked && (
        // Backdrop for the overlay drawer.
        <div
          className="fixed inset-x-0 top-12 bottom-0 z-10 bg-black/40"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        aria-label="Contents and search"
        className={
          docked
            ? "relative z-0 flex h-full w-84 shrink-0 flex-col border-r border-foreground/10 bg-background pt-12 text-foreground"
            : "fixed top-12 bottom-0 left-0 z-20 flex w-[min(22rem,88vw)] flex-col bg-background text-foreground shadow-xl"
        }
      >
        <div className="flex items-center justify-between border-b border-foreground/10 px-2">
          <div
            role="tablist"
            aria-label="Sidebar sections"
            className="flex min-w-0 flex-1"
          >
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`sidebar-tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`sidebar-panel-${id}`}
                onClick={() => onTabChange(id)}
                className={`min-w-0 flex-1 truncate border-b-2 px-1 py-2.5 text-center text-xs ${
                  tab === id
                    ? "border-foreground font-medium"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex size-8 items-center justify-center rounded-lg text-lg hover:bg-foreground/10"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        {/* Both panels stay mounted so scroll position, expanded sections and search state survive tab switches. */}
        <div
          role="tabpanel"
          id="sidebar-panel-contents"
          aria-labelledby="sidebar-tab-contents"
          hidden={tab !== "contents"}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <TocPanel
            outline={outline}
            currentPage={currentPage}
            onGoToPage={onGoToPage}
            visible={tab === "contents"}
          />
        </div>
        <div
          role="tabpanel"
          id="sidebar-panel-search"
          aria-labelledby="sidebar-tab-search"
          hidden={tab !== "search"}
          className="min-h-0 flex-1"
        >
          <SearchPanel
            search={search}
            hasTextLayer={hasTextLayer}
            active={tab === "search"}
            focusSignal={searchFocusSignal}
            onClose={onClose}
          />
        </div>
        <div
          role="tabpanel"
          id="sidebar-panel-bookmarks"
          aria-labelledby="sidebar-tab-bookmarks"
          hidden={tab !== "bookmarks"}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <BookmarksPanel
            bookmarks={bookmarks}
            currentPage={currentPage}
            onGoToPage={onGoToPage}
          />
        </div>
        <div
          role="tabpanel"
          id="sidebar-panel-highlights"
          aria-labelledby="sidebar-tab-highlights"
          hidden={tab !== "highlights"}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <HighlightsPanel
            bookId={bookId}
            highlights={highlights}
            currentPage={currentPage}
            onGoToPage={onGoToPage}
          />
        </div>
      </aside>
    </>
  );
}
