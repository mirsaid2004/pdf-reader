/**
 * Reading progress as 0–100: page 1 is 0% (not started) and the last page is
 * 100%. Computed on the server from the book's real page count.
 */
export function percentForPage(page: number, pageCount: number): number {
  if (pageCount <= 1) return 0;
  const clamped = Math.min(Math.max(page, 1), pageCount);
  return Math.round(((clamped - 1) / (pageCount - 1)) * 1000) / 10;
}
