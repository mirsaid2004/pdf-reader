/** Case-insensitive substring match on title/author (same semantics as the old SQL ILIKE). */
export function filterBooks<
  T extends { title: string; author: string | null; shelfIds: string[] },
>(books: T[], view: { shelfId: string | null; q: string }): T[] {
  const needle = view.q.trim().toLowerCase();
  if (!view.shelfId && !needle) return books;
  return books.filter(
    (book) =>
      (!view.shelfId || book.shelfIds.includes(view.shelfId)) &&
      (!needle ||
        book.title.toLowerCase().includes(needle) ||
        (book.author?.toLowerCase().includes(needle) ?? false)),
  );
}
