import type { Metadata } from "next";

import { BookHighlightsPage } from "@/pages/book-highlights";

export const metadata: Metadata = { title: "Highlights" };

export default function Page({
  params,
}: PageProps<"/books/[bookId]/highlights">) {
  return <BookHighlightsPage params={params} />;
}
