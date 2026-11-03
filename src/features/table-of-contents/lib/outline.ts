// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

export type OutlineNode = {
  title: string;
  page: number | null;
  items: OutlineNode[];
};

export type FlatOutlineItem = {
  /** Path-like id, e.g. "2.0.1" (stable for a given outline). */
  id: string;
  title: string;
  page: number | null;
  depth: number;
  parentId: string | null;
  hasChildren: boolean;
};

/** Pre-order (document order) flattening of the outline tree. */
export function flattenOutline(nodes: OutlineNode[]): FlatOutlineItem[] {
  const out: FlatOutlineItem[] = [];
  const walk = (
    list: OutlineNode[],
    depth: number,
    parentId: string | null,
  ) => {
    list.forEach((node, index) => {
      const id = parentId === null ? String(index) : `${parentId}.${index}`;
      out.push({
        id,
        title: node.title,
        page: node.page,
        depth,
        parentId,
        hasChildren: node.items.length > 0,
      });
      walk(node.items, depth + 1, id);
    });
  };
  walk(nodes, 0, null);
  return out;
}

/**
 * The section the reader is in: the entry with the greatest page that is
 * still <= `currentPage`. Ties go to the later entry in document order (the
 * deeper/more specific one). Entries without a page are skipped.
 */
export function findCurrentSectionId(
  flat: FlatOutlineItem[],
  currentPage: number,
): string | null {
  let best: FlatOutlineItem | null = null;
  for (const item of flat) {
    if (item.page === null || item.page > currentPage) continue;
    if (best === null || item.page >= (best.page ?? 0)) best = item;
  }
  return best?.id ?? null;
}

/** Ids of all ancestors of `id` (nearest last). */
export function ancestorIds(flat: FlatOutlineItem[], id: string): string[] {
  const byId = new Map(flat.map((item) => [item.id, item]));
  const chain: string[] = [];
  let parent = byId.get(id)?.parentId ?? null;
  while (parent !== null) {
    chain.unshift(parent);
    parent = byId.get(parent)?.parentId ?? null;
  }
  return chain;
}
