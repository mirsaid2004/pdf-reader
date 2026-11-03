/** Builds a /library URL; the view (shelf + search) lives in the URL. */
export function libraryHref(view: {
  shelf?: string | null;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  if (view.shelf) params.set("shelf", view.shelf);
  const q = view.q?.trim();
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}
