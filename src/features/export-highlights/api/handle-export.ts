import "server-only";

import { getReaderBook } from "@/entities/book/server";
import { getHighlights } from "@/entities/highlight/server";
import { getCurrentUser } from "@/shared/auth";

import { exportFileName, formatHighlightsMarkdown } from "../lib/markdown";

/** GET: a book's highlights and notes as a Markdown download (owner only). */
export async function handleHighlightsExport(
  bookId: string,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const owned = await getReaderBook(user.id, bookId);
  if (!owned) return new Response(null, { status: 404 });

  const highlights = await getHighlights(user.id, bookId);
  const markdown = formatHighlightsMarkdown({
    title: owned.book.title,
    author: owned.book.author,
    exportedAt: new Date(),
    highlights,
  });

  const fileName = exportFileName(owned.book.title);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
