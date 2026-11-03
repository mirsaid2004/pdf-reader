import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  MAX_OUTLINE_DEPTH,
  MAX_OUTLINE_ITEMS,
  type OutlineItem,
} from "@/entities/book";
import { loadPdfjs } from "@/shared/lib/pdfjs";
import type { CoverContentType } from "@/shared/lib/r2/keys";

export type PdfInfo = {
  title: string;
  author: string | null;
  pageCount: number;
  hasTextLayer: boolean;
  outline: OutlineItem[] | null;
  cover: { blob: Blob; contentType: CoverContentType } | null;
};

export class PdfReadError extends Error {}

const COVER_WIDTH_PX = 400;
/** Fewer non-whitespace chars than this across sampled pages ⇒ treat as scanned. */
const TEXT_LAYER_MIN_CHARS = 50;

export async function extractPdfInfo(file: File): Promise<PdfInfo> {
  const pdfjs = await loadPdfjs();
  let doc: PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
  } catch (error) {
    if (error instanceof pdfjs.PasswordException) {
      throw new PdfReadError("Password-protected PDFs aren't supported.");
    }
    throw new PdfReadError("This file couldn't be read as a PDF.");
  }

  try {
    const [meta, outline, hasTextLayer, cover] = await Promise.all([
      readMetadata(doc),
      readOutline(doc).catch(() => null),
      detectTextLayer(doc).catch(() => true),
      renderCover(doc).catch(() => null),
    ]);
    return {
      title: meta.title ?? titleFromFileName(file.name),
      author: meta.author,
      pageCount: doc.numPages,
      hasTextLayer,
      outline,
      cover,
    };
  } finally {
    // v6: destroy lives on the loading task (the shared worker port stays alive).
    await doc.loadingTask.destroy();
  }
}

// ── metadata ──────────────────────────────────────────────────────────

const JUNK_TITLE =
  /^(untitled|unknown|document\d*|microsoft (word|powerpoint) - .*|.*\.(docx?|pptx?|pdf|tex|indd|qxd))$/i;

async function readMetadata(
  doc: PDFDocumentProxy,
): Promise<{ title: string | null; author: string | null }> {
  // `info` is typed as `object` by pdf.js; read known keys defensively.
  const { info } = await doc.getMetadata().catch(() => ({ info: {} }));
  const read = (key: string): string | null => {
    const value: unknown = (info as Record<string, unknown>)[key];
    if (typeof value !== "string") return null;
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed ? trimmed.slice(0, 300) : null;
  };
  const title = read("Title");
  return {
    title: title && !JUNK_TITLE.test(title) ? title : null,
    author: read("Author"),
  };
}

function titleFromFileName(name: string): string {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .trim();
  return (base || "Untitled").slice(0, 300);
}

// ── outline ───────────────────────────────────────────────────────────

type RawOutlineNode = Awaited<
  ReturnType<PDFDocumentProxy["getOutline"]>
>[number];

async function readOutline(
  doc: PDFDocumentProxy,
): Promise<OutlineItem[] | null> {
  const raw = await doc.getOutline();
  if (!raw || raw.length === 0) return null;

  let budget = MAX_OUTLINE_ITEMS;

  const resolvePage = async (
    dest: RawOutlineNode["dest"],
  ): Promise<number | null> => {
    try {
      const explicit =
        typeof dest === "string" ? await doc.getDestination(dest) : dest;
      const target: unknown = explicit?.[0];
      if (typeof target === "number") return target + 1;
      if (
        target &&
        typeof target === "object" &&
        "num" in target &&
        "gen" in target
      ) {
        return (
          (await doc.getPageIndex(target as { num: number; gen: number })) + 1
        );
      }
    } catch {
      // Broken destinations are common; keep the entry without a page.
    }
    return null;
  };

  const walk = async (
    nodes: RawOutlineNode[],
    depth: number,
  ): Promise<OutlineItem[]> => {
    const result: OutlineItem[] = [];
    for (const node of nodes) {
      if (budget <= 0) break;
      budget--;
      const children: RawOutlineNode[] = Array.isArray(node.items)
        ? node.items
        : [];
      result.push({
        title: (node.title || "Untitled")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500),
        page: await resolvePage(node.dest),
        items: depth < MAX_OUTLINE_DEPTH ? await walk(children, depth + 1) : [],
      });
    }
    return result;
  };

  return walk(raw, 1);
}

// ── text layer ────────────────────────────────────────────────────────

async function detectTextLayer(doc: PDFDocumentProxy): Promise<boolean> {
  const n = doc.numPages;
  // First pages are often image-only covers, so also sample the middle page.
  const pages = new Set(
    [1, 2, 3, 4, 5, Math.ceil(n / 2)].filter((p) => p <= n),
  );
  let chars = 0;
  for (const pageNumber of pages) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ("str" in item) chars += item.str.replace(/\s+/g, "").length;
    }
    page.cleanup();
    if (chars >= TEXT_LAYER_MIN_CHARS) return true;
  }
  return false;
}

// ── cover ─────────────────────────────────────────────────────────────

async function renderCover(
  doc: PDFDocumentProxy,
): Promise<{ blob: Blob; contentType: CoverContentType } | null> {
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: COVER_WIDTH_PX / base.width });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;
  page.cleanup();

  // Safari may silently ignore WebP and return PNG; fall back to JPEG then.
  const webp = await toBlob(canvas, "image/webp", 0.82);
  if (webp?.type === "image/webp")
    return { blob: webp, contentType: "image/webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (jpeg?.type === "image/jpeg")
    return { blob: jpeg, contentType: "image/jpeg" };
  return null;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}
