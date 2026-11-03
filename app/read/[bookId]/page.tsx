import type { Metadata } from "next";

import { ReaderPage } from "@/pages/reader";

export const metadata: Metadata = { title: "Reading" };

export default function Page({
  params,
  searchParams,
}: PageProps<"/read/[bookId]">) {
  return <ReaderPage params={params} searchParams={searchParams} />;
}
