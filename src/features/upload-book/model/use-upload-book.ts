"use client";

import { useCallback, useRef, useState } from "react";

import { createBook, requestUpload } from "../api/actions";
import {
  extractPdfInfo,
  type PdfInfo,
  PdfReadError,
} from "../lib/extract-pdf-info";
import { putWithProgress } from "../lib/put-with-progress";
import { validatePdfFile } from "../lib/validate-file";
import { PDF_CONTENT_TYPE } from "./schemas";

export type UploadState =
  | { status: "idle" }
  | { status: "analyzing"; file: File }
  | { status: "ready"; file: File; info: PdfInfo }
  | {
      status: "uploading";
      file: File;
      info: PdfInfo;
      loaded: number;
      total: number;
    }
  | { status: "finalizing"; file: File; info: PdfInfo }
  | { status: "done"; bookId: string; title: string }
  | { status: "error"; message: string; retry?: { file: File; info: PdfInfo } };

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export function useUploadBook() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ status: "idle" });
  }, []);

  const selectFile = useCallback(async (file: File) => {
    const invalid = await validatePdfFile(file);
    if (invalid) return setState({ status: "error", message: invalid });

    setState({ status: "analyzing", file });
    try {
      const info = await extractPdfInfo(file);
      setState({ status: "ready", file, info });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof PdfReadError
            ? error.message
            : "This PDF couldn't be processed.",
      });
    }
  }, []);

  const upload = useCallback(
    async (
      file: File,
      info: PdfInfo,
      details: { title: string; author: string | null },
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const finalInfo: PdfInfo = { ...info, ...details };
      const fail = (message: string) =>
        setState({
          status: "error",
          message,
          retry: { file, info: finalInfo },
        });

      try {
        const target = await requestUpload({
          fileSize: file.size,
          cover: info.cover
            ? {
                contentType: info.cover.contentType,
                size: info.cover.blob.size,
              }
            : null,
        });
        if (!target.ok) return fail(target.error);

        const cover = target.data.coverUrl ? info.cover : null;
        const total = file.size + (cover?.blob.size ?? 0);
        let pdfLoaded = 0;
        let coverLoaded = 0;
        const report = () =>
          setState({
            status: "uploading",
            file,
            info: finalInfo,
            loaded: pdfLoaded + coverLoaded,
            total,
          });
        report();

        await Promise.all([
          putWithProgress({
            url: target.data.pdfUrl,
            body: file,
            contentType: PDF_CONTENT_TYPE,
            signal: controller.signal,
            onProgress: (n) => {
              pdfLoaded = n;
              report();
            },
          }),
          cover && target.data.coverUrl
            ? putWithProgress({
                url: target.data.coverUrl,
                body: cover.blob,
                contentType: cover.contentType,
                signal: controller.signal,
                onProgress: (n) => {
                  coverLoaded = n;
                  report();
                },
              }).catch(() => undefined) // a failed cover upload isn't fatal
            : null,
        ]);

        setState({ status: "finalizing", file, info: finalInfo });
        const created = await createBook({
          bookId: target.data.bookId,
          title: details.title,
          author: details.author,
          pageCount: info.pageCount,
          hasTextLayer: info.hasTextLayer,
          outline: info.outline,
          coverContentType: cover?.contentType ?? null,
        });
        if (!created.ok) return fail(created.error);

        setState({
          status: "done",
          bookId: created.data.bookId,
          title: details.title,
        });
      } catch (error) {
        if (isAbort(error)) return setState({ status: "idle" });
        fail(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  return { state, selectFile, upload, reset };
}
