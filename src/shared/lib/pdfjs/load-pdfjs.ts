import type * as Pdfjs from "pdfjs-dist";

type PdfjsModule = typeof Pdfjs;

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Lazily loads pdf.js in the browser and wires up its web worker once.
 * Never call during SSR: pdf.js needs DOM/canvas APIs.
 */
export function loadPdfjs(): Promise<PdfjsModule> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("pdf.js can only be loaded in the browser"),
    );
  }
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

export type { PdfjsModule };
