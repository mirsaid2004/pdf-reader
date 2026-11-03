import { formatFileSize } from "@/entities/book";
import { publicEnv } from "@/shared/config";

import { PDF_CONTENT_TYPE } from "../model/schemas";

/** Returns an error message, or null when the file looks like an acceptable PDF. */
export async function validatePdfFile(file: File): Promise<string | null> {
  // Some OSes report an empty MIME type; fall back to the extension, then
  // verify the magic bytes either way.
  const looksLikePdf =
    file.type === PDF_CONTENT_TYPE ||
    (file.type === "" && /\.pdf$/i.test(file.name));
  if (!looksLikePdf) return "Only PDF files can be uploaded.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > publicEnv.maxUploadBytes) {
    return `This file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(publicEnv.maxUploadBytes)}.`;
  }
  const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (header !== "%PDF-") return "This file isn't a valid PDF.";
  return null;
}
