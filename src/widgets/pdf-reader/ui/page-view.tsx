"use client";

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { memo, useEffect, useRef, useState } from "react";

import { computeSearchRects } from "@/features/search-book";
import { loadPdfjs } from "@/shared/lib/pdfjs";
import type { NormalizedRect } from "@/shared/lib/text-rects";

import type { PageSize } from "../model/use-virtual-pages";

import "./text-layer.css";

/** Browsers cap canvas area (iOS Safari ≈ 16.7M px); stay under it. */
const MAX_CANVAS_PIXELS = 16_000_000;
const MAX_OUTPUT_SCALE = 2;
/** Skip rendering pages that fly past during fast scrolling. */
const RENDER_DELAY_MS = 120;

type PageViewProps = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  /** CSS pixels per PDF point. */
  cssScale: number;
  left: number;
  top: number;
  width: number;
  height: number;
  canvasFilter: string;
  onSize: (page: number, size: PageSize) => void;
  onRenderError: () => void;
  /** Folded search query to highlight on this page ("" for none). */
  highlightQuery: string;
  /** Which hit on this page is the active one, if any. */
  activeOrdinal: number | null;
  /** Changes on each navigation so the active hit is scrolled to again. */
  focusToken: number;
};

const NO_HITS: NormalizedRect[][] = [];

const isCancelled = (error: unknown) =>
  error instanceof Error && error.name === "RenderingCancelledException";

export const PageView = memo(function PageView({
  doc,
  pageNumber,
  cssScale,
  left,
  top,
  width,
  height,
  canvasFilter,
  onSize,
  onRenderError,
  highlightQuery: query,
  activeOrdinal,
  focusToken,
}: PageViewProps) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const textHost = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // The rendered text layer's spans, used to locate search hits.
  const layerRef = useRef<{
    divs: readonly HTMLElement[];
    strings: readonly string[];
  } | null>(null);
  const [layerVersion, setLayerVersion] = useState(0);
  const [hits, setHits] = useState<NormalizedRect[][]>(NO_HITS);
  const handledFocus = useRef<number | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);

  // 1. Get the page and report its real size (corrects the layout estimate).
  useEffect(() => {
    let cancelled = false;
    doc
      .getPage(pageNumber)
      .then((loaded) => {
        if (cancelled) return;
        const viewport = loaded.getViewport({ scale: 1 });
        onSize(pageNumber, { width: viewport.width, height: viewport.height });
        setPage(loaded);
      })
      .catch(() => {
        if (!cancelled) onRenderError();
      });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, onSize, onRenderError]);

  useEffect(
    () => () => {
      try {
        page?.cleanup();
      } catch {
        // the document may already be destroyed
      }
    },
    [page],
  );

  // 2. Render canvas + text layer off-screen, then swap them in. The old
  //    ones stay (stretched by CSS) until the new ones are ready: no flicker on zoom.
  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    let textLayer: { cancel: () => void } | undefined;

    const timer = setTimeout(async () => {
      try {
        const { TextLayer } = await loadPdfjs();

        let outputScale = Math.min(
          window.devicePixelRatio || 1,
          MAX_OUTPUT_SCALE,
        );
        const base = page.getViewport({ scale: cssScale });
        const pixels = base.width * base.height * outputScale * outputScale;
        if (pixels > MAX_CANVAS_PIXELS)
          outputScale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

        const viewport = page.getViewport({ scale: cssScale * outputScale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%";

        task = page.render({ canvas, viewport });
        await task.promise;
        if (cancelled) return;
        canvasHost.current?.replaceChildren(canvas);

        const container = document.createElement("div");
        container.className = "textLayer";
        const layer = new TextLayer({
          textContentSource: page.streamTextContent(),
          container,
          viewport: page.getViewport({ scale: cssScale }),
        });
        textLayer = layer;
        await layer.render();
        if (cancelled) return;
        textHost.current?.replaceChildren(container);
        layerRef.current = {
          divs: layer.textDivs,
          strings: layer.textContentItemsStr,
        };
        setLayerVersion((version) => version + 1);
      } catch (error) {
        if (
          !cancelled &&
          !isCancelled(error) &&
          !(error instanceof Error && error.name === "AbortException")
        ) {
          onRenderError();
        }
      }
    }, RENDER_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
      textLayer?.cancel();
    };
  }, [page, cssScale, onRenderError]);

  // 3. Search hits on this page: measured against the text layer, stored as
  //    fractions of the page size, so zooming needs no recalculation.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const layer = layerRef.current;
      const pageElement = pageRef.current;
      if (!query || !layer || !pageElement) {
        setHits((previous) => (previous.length === 0 ? previous : NO_HITS));
        return;
      }
      setHits(
        computeSearchRects({
          divs: layer.divs,
          strings: layer.strings,
          foldedQuery: query,
          pageElement,
        }),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [query, layerVersion]);

  // 4. Bring the active hit into view (once per navigation).
  const activeGroup =
    activeOrdinal === null ? -1 : Math.min(activeOrdinal, hits.length - 1);
  useEffect(() => {
    if (activeGroup < 0 || handledFocus.current === focusToken) return;
    const target = pageRef.current?.querySelector<HTMLElement>(
      '[data-active-hit="true"]',
    );
    if (!target) return;
    handledFocus.current = focusToken;
    target.scrollIntoView({ block: "center", inline: "nearest" });
  }, [activeGroup, focusToken, hits]);

  return (
    <div
      ref={pageRef}
      className="pdf-page absolute shadow-md"
      aria-label={`Page ${pageNumber}`}
      style={
        {
          left,
          top,
          width,
          height,
          "--total-scale-factor": cssScale,
        } as React.CSSProperties
      }
    >
      {/* The filter applies to the canvas layer only; the text layer is untouched. */}
      <div
        ref={canvasHost}
        className="absolute inset-0 bg-white"
        style={{ filter: canvasFilter === "none" ? undefined : canvasFilter }}
      />
      {hits.length > 0 && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {hits.map((group, groupIndex) =>
            group.map((rect, rectIndex) => (
              <div
                key={`${groupIndex}-${rectIndex}`}
                data-active-hit={
                  groupIndex === activeGroup && rectIndex === 0
                    ? "true"
                    : undefined
                }
                className={
                  groupIndex === activeGroup
                    ? "absolute rounded-[2px] bg-orange-400/60 ring-1 ring-orange-600/70"
                    : "absolute rounded-[2px] bg-yellow-300/50"
                }
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.w * 100}%`,
                  height: `${rect.h * 100}%`,
                }}
              />
            )),
          )}
        </div>
      )}
      <div ref={textHost} className="absolute inset-0" />
    </div>
  );
});
