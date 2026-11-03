import type { ReadingReport } from "../model/tracker";

/**
 * POSTs a reading report. `keepalive` lets the request outlive the page, so
 * it works while the tab is closing or navigating away.
 */
export async function sendReadingReport(
  bookId: string,
  report: ReadingReport,
): Promise<boolean> {
  try {
    const response = await fetch(`/api/books/${bookId}/reading`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
