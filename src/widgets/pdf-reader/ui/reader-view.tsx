"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ReaderBook } from "@/entities/book";
import { useReadingTracker } from "@/features/track-reading";
import { useStoredState } from "@/shared/lib/use-stored-state";

import { isReaderTheme, THEME_STYLES, type ReaderTheme } from "../model/themes";
import { useElementSize } from "../model/use-element-size";
import { useFullscreen } from "../model/use-fullscreen";
import { useReaderKeys } from "../model/use-reader-keys";
import {
  PAD_X,
  useVirtualPages,
  type PageSize,
} from "../model/use-virtual-pages";
import { PageView } from "./page-view";
import { Toolbar } from "./toolbar";

/** pdf.js "100%" = 96 CSS px per inch over 72 points per inch. */
const CSS_UNITS = 96 / 72;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const MAX_FIT_ZOOM = 3;
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
const TOOLBAR_HIDE_DELAY_MS = 3000;
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_MS = 350;
const EDGE_TAP_FRACTION = 0.22;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const subscribeCoarse = (onChange: () => void) => {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

type ReaderViewProps = {
  book: ReaderBook;
  doc: PDFDocumentProxy;
  firstPage: PageSize;
  initialPage: number;
  onPageChange: (page: number) => void;
  onRenderError: () => void;
};

export function ReaderView({
  book,
  doc,
  firstPage,
  initialPage,
  onPageChange,
  onRenderError,
}: ReaderViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(scroller);

  // ── preferences (per device) ──
  const [themeValue, setTheme] = useStoredState("reader:theme", "light");
  const theme: ReaderTheme = isReaderTheme(themeValue) ? themeValue : "light";
  const [zoomValue, setZoomValue] = useStoredState("reader:zoom", "fit");
  const [pinchZoom, setPinchZoom] = useState<number | null>(null);

  // ── zoom ──
  const fitZoom = clamp(
    (size.width - PAD_X * 2) / (firstPage.width * CSS_UNITS),
    MIN_ZOOM,
    MAX_FIT_ZOOM,
  );
  const storedZoom = Number.parseFloat(zoomValue);
  const isFit =
    pinchZoom === null && !(storedZoom >= MIN_ZOOM && storedZoom <= MAX_ZOOM);
  const zoom = pinchZoom ?? (isFit ? fitZoom : storedZoom);
  const cssScale = zoom * CSS_UNITS;

  const { layout, view, reportSize, scrollToPage } = useVirtualPages({
    el: scroller,
    size,
    pageCount: book.pageCount,
    defaultSize: firstPage,
    scale: cssScale,
    initialPage,
  });

  const stepZoom = useCallback(
    (direction: 1 | -1) => {
      const next =
        direction > 0
          ? ZOOM_STEPS.find((step) => step > zoom + 0.001)
          : [...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001);
      if (next) setZoomValue(String(next));
    },
    [zoom, setZoomValue],
  );

  // ── navigation ──
  const goToPage = useCallback(
    (page: number) => scrollToPage(clamp(page, 1, book.pageCount)),
    [scrollToPage, book.pageCount],
  );
  const { current: currentPage } = view;

  useReadingTracker({ bookId: book.id, initialPage, currentPage });

  // Keep ?page=N in the URL so a refresh stays put, and tell the parent so a
  // hidden-then-shown route resumes here (saving to the DB is Phase 5).
  useEffect(() => {
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(currentPage));
      window.history.replaceState(window.history.state, "", url);
      onPageChange(currentPage);
    }, 400);
    return () => clearTimeout(id);
  }, [currentPage, onPageChange]);

  // ── fullscreen + toolbar visibility ──
  const fullscreen = useFullscreen(rootRef);
  const coarsePointer = useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
  const autoHide = fullscreen.active || coarsePointer;
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    if (autoHide) {
      hideTimer.current = setTimeout(
        () => setToolbarVisible(false),
        TOOLBAR_HIDE_DELAY_MS,
      );
    }
  }, [autoHide]);

  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // (Re)start the idle timer when auto-hide turns on (fullscreen / touch device).
  useEffect(() => {
    scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [scheduleHide]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") showToolbar();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", showToolbar);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", showToolbar);
    };
  }, [showToolbar]);

  useReaderKeys({
    previousPage: () => goToPage(currentPage - 1),
    nextPage: () => goToPage(currentPage + 1),
    firstPage: () => goToPage(1),
    lastPage: () => goToPage(book.pageCount),
    zoomIn: () => stepZoom(1),
    zoomOut: () => stepZoom(-1),
    toggleFullscreen: fullscreen.toggle,
  });

  useEffect(() => {
    scroller?.focus({ preventScroll: true });
  }, [scroller]);

  // ── touch: tap edges to turn pages, tap centre to toggle toolbar, pinch to zoom ──
  const tap = useRef<{ id: number; x: number; y: number; at: number } | null>(
    null,
  );
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const pinchFrame = useRef(0);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType !== "touch") return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      tap.current = null;
      pinch.current = { distance: pinchDistance(), zoom: zoomRef.current };
    } else if (event.isPrimary) {
      tap.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: Date.now(),
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const start = pinch.current;
    if (!start || pointers.current.size !== 2 || start.distance === 0) return;
    cancelAnimationFrame(pinchFrame.current);
    pinchFrame.current = requestAnimationFrame(() => {
      setPinchZoom(
        clamp(
          start.zoom * (pinchDistance() / start.distance),
          MIN_ZOOM,
          MAX_ZOOM,
        ),
      );
    });
  };

  const endPointer = (event: React.PointerEvent, cancelled: boolean) => {
    if (event.pointerType !== "touch") return;
    pointers.current.delete(event.pointerId);

    if (pinch.current && pointers.current.size < 2) {
      cancelAnimationFrame(pinchFrame.current);
      pinch.current = null;
      // Commit the pinched zoom as the preference (rounded to avoid noisy values).
      setPinchZoom((value) => {
        if (value !== null) setZoomValue(String(Math.round(value * 100) / 100));
        return null;
      });
      return;
    }

    const start = tap.current;
    tap.current = null;
    if (cancelled || !start || start.id !== event.pointerId) return;
    if (
      Math.hypot(event.clientX - start.x, event.clientY - start.y) >
      TAP_MAX_MOVE_PX
    )
      return;
    if (Date.now() - start.at > TAP_MAX_MS) return;
    if (!window.getSelection()?.isCollapsed) return; // text selection in progress

    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;
    if (fraction < EDGE_TAP_FRACTION) goToPage(currentPage - 1);
    else if (fraction > 1 - EDGE_TAP_FRACTION) goToPage(currentPage + 1);
    else if (toolbarVisible) {
      clearTimeout(hideTimer.current);
      setToolbarVisible(false);
    } else showToolbar();
  };

  const themeStyle = THEME_STYLES[theme];
  const pages = [];
  if (scroller && size.width > 0) {
    for (let i = view.first; i <= view.last; i++) {
      const width = layout.widths[i] ?? 0;
      pages.push(
        <PageView
          key={i}
          doc={doc}
          pageNumber={i + 1}
          cssScale={cssScale}
          left={(layout.contentWidth - width) / 2}
          top={layout.tops[i] ?? 0}
          width={width}
          height={layout.heights[i] ?? 0}
          canvasFilter={themeStyle.canvasFilter}
          onSize={reportSize}
          onRenderError={onRenderError}
        />,
      );
    }
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50"
      style={{ background: themeStyle.surface }}
    >
      <Toolbar
        visible={toolbarVisible}
        title={book.title}
        currentPage={currentPage}
        pageCount={book.pageCount}
        onGoToPage={goToPage}
        zoomPercent={Math.round(zoom * 100)}
        isFit={isFit}
        canZoomIn={zoom < MAX_ZOOM - 0.001}
        canZoomOut={zoom > ZOOM_STEPS[0]! + 0.001}
        onZoomIn={() => stepZoom(1)}
        onZoomOut={() => stepZoom(-1)}
        onFitWidth={() => setZoomValue("fit")}
        theme={theme}
        onThemeChange={setTheme}
        fullscreenSupported={fullscreen.supported}
        isFullscreen={fullscreen.active}
        onToggleFullscreen={fullscreen.toggle}
        onInteract={showToolbar}
      />
      <div
        ref={setScroller}
        tabIndex={0}
        role="document"
        aria-label={`${book.title}, ${book.pageCount} pages`}
        // pan-x/pan-y hands pinch gestures to us instead of zooming the whole page.
        style={{ touchAction: "pan-x pan-y" }}
        className="absolute inset-0 overflow-auto overscroll-contain outline-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event, false)}
        onPointerCancel={(event) => endPointer(event, true)}
      >
        <div
          className="relative"
          style={{ width: layout.contentWidth, height: layout.totalHeight }}
        >
          {pages}
        </div>
      </div>
    </div>
  );
}
