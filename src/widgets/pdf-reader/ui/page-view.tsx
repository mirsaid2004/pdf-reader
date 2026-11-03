"use client";

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { memo, useEffect, useRef, useState } from "react";

import { loadPdfjs } from "@/shared/lib/pdfjs";

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
};

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
}: PageViewProps) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const textHost = useRef<HTMLDivElement>(null);
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

  return (
    <div
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
      <div ref={textHost} className="absolute inset-0" />
    </div>
  );
});
