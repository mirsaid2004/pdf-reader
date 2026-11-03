"use client";

import { useRef } from "react";

import { UploadBookPanel } from "./upload-book-panel";
import { useUploadBook } from "../model/use-upload-book";

export function UploadBookButton({ label = "Upload PDF" }: { label?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const upload = useUploadBook();
  const busy =
    upload.state.status === "uploading" || upload.state.status === "finalizing";

  const close = () => {
    // Closing always resets; mid-upload this aborts the in-flight PUTs.
    upload.reset();
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        aria-labelledby="upload-book-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-foreground/10 bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-3">
          <h2 id="upload-book-title" className="font-semibold">
            Upload a book
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-md px-2 py-1 text-sm text-foreground/60 hover:bg-foreground/5"
          >
            {busy ? "Cancel upload" : "Close"}
          </button>
        </div>
        <div className="p-5">
          <UploadBookPanel {...upload} onClose={close} />
        </div>
      </dialog>
    </>
  );
}
