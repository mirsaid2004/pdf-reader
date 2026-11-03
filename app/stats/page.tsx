import type { Metadata } from "next";

import { StatsPage } from "@/pages/stats";

export const metadata: Metadata = { title: "Reading stats" };

export default function Page() {
  return <StatsPage />;
}
