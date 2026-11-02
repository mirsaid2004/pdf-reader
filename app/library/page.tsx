import type { Metadata } from "next";

import { LibraryPage } from "@/pages/library";

export const metadata: Metadata = { title: "Library" };

export default function Page() {
  return <LibraryPage />;
}
