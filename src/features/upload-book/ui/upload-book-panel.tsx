"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { formatFileSize } from "@/entities/book";
import { publicEnv } from "@/shared/config";

import type { PdfInfo } from "../lib/extract-pdf-info";
import type { useUploadBook } from "../model/use-upload-book";

type Props = ReturnType<typeof useUploadBook> & { onClose: () => void };

export function UploadBookPanel({
  state,
  selectFile,
  upload,
  reset,
  onClose,
}: Props) {
  switch (state.status) {
    case "idle":
      return <Dropzone onFile={selectFile} />;
    case "analyzing":
      return <Status text={`Reading “${state.file.name}”…`} />;
    case "ready":
      return (
        <DetailsForm
          file={state.file}
          info={state.info}
          onSubmit={(details) => upload(state.file, state.info, details)}
          onBack={reset}
        />
      );
    case "uploading": {
      const percent = state.total
        ? Math.round((state.loaded / state.total) * 100)
        : 0;
      return (
        <div className="flex flex-col gap-3">
          <p className="truncate text-sm font-medium">{state.info.title}</p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className="h-full bg-foreground transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-foreground/60">
            {percent}% · {formatFileSize(state.loaded)} of{" "}
            {formatFileSize(state.total)}
          </p>
        </div>
      );
    }
    case "finalizing":
      return <Status text="Finishing up…" />;
    case "done":
      return (
        <div className="flex flex-col gap-4">
          <p>
            <span className="font-medium">“{state.title}”</span> was added to
            your library.
          </p>
          <div className="flex gap-2">
            <PrimaryButton onClick={onClose}>Done</PrimaryButton>
            <SecondaryButton onClick={reset}>Upload another</SecondaryButton>
          </div>
        </div>
      );
    case "error":
      return (
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </p>
          <div className="flex gap-2">
            {state.retry && (
              <PrimaryButton
                onClick={() => {
                  const { file, info } = state.retry!;
                  void upload(file, info, {
                    title: info.title,
                    author: info.author,
                  });
                }}
              >
                Try again
              </PrimaryButton>
            )}
            <SecondaryButton onClick={reset}>
              Choose another file
            </SecondaryButton>
          </div>
        </div>
      );
  }
}

function Dropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging
          ? "border-foreground/60 bg-foreground/5"
          : "border-foreground/20 hover:bg-foreground/5"
      }`}
    >
      <span className="font-medium">Drop a PDF here or click to choose</span>
      <span className="text-xs text-foreground/60">
        Up to {formatFileSize(publicEnv.maxUploadBytes)}
      </span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function DetailsForm({
  file,
  info,
  onSubmit,
  onBack,
}: {
  file: File;
  info: PdfInfo;
  onSubmit: (details: { title: string; author: string | null }) => void;
  onBack: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const title = String(form.get("title") ?? "").trim();
        const author = String(form.get("author") ?? "").trim();
        if (title) onSubmit({ title, author: author || null });
      }}
    >
      <div className="flex gap-4">
        <CoverPreview blob={info.cover?.blob ?? null} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Field
            label="Title"
            name="title"
            defaultValue={info.title}
            required
          />
          <Field
            label="Author"
            name="author"
            defaultValue={info.author ?? ""}
          />
          <p className="text-xs text-foreground/60">
            {info.pageCount} pages · {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      {!info.hasTextLayer && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          This looks like a scanned PDF without a text layer. You can read it,
          but search and highlighting won’t work.
        </p>
      )}
      <div className="flex gap-2">
        <PrimaryButton type="submit">Upload</PrimaryButton>
        <SecondaryButton onClick={onBack}>Choose another file</SecondaryButton>
      </div>
    </form>
  );
}

function CoverPreview({ blob }: { blob: Blob | null }) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  if (!url) {
    return (
      <div className="aspect-[3/4] w-24 shrink-0 rounded-md bg-foreground/10" />
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={96}
      height={128}
      unoptimized // local blob: URL, nothing to optimize
      className="aspect-[3/4] w-24 shrink-0 rounded-md object-cover shadow"
    />
  );
}

function Field({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-foreground/70">{label}</span>
      <input
        {...input}
        maxLength={300}
        className="rounded-lg border border-foreground/15 bg-transparent px-3 py-1.5 outline-none focus:border-foreground/40"
      />
    </label>
  );
}

function Status({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-3 text-sm text-foreground/70">
      <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      {text}
    </p>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-lg border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5"
    />
  );
}
