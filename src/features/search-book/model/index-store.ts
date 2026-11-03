import {
  openDatabase,
  requestToPromise,
  transactionDone,
} from "@/shared/lib/idb";

const DB_NAME = "pdf-reader-search";
const DB_VERSION = 1;
/** Bump when how page text is extracted changes; old caches are discarded. */
const INDEX_VERSION = 1;
/** Books kept in the cache; the least recently used are evicted beyond this. */
const MAX_CACHED_BOOKS = 30;

type BookMeta = { bookId: string; version: number; lastUsed: number };
type PageRecord = { bookId: string; page: number; text: string };

const pageRange = (bookId: string) =>
  IDBKeyRange.bound([bookId, 0], [bookId, Number.MAX_SAFE_INTEGER]);

/** Persistent per-book page text, so searching a book is instant after the first time. */
export class SearchIndexStore {
  #db: IDBDatabase;

  private constructor(db: IDBDatabase) {
    this.#db = db;
  }

  /** Null when IndexedDB is unavailable (private mode, blocked, old browser). */
  static async open(): Promise<SearchIndexStore | null> {
    try {
      if (typeof indexedDB === "undefined") return null;
      const db = await openDatabase(DB_NAME, DB_VERSION, (database) => {
        database.createObjectStore("books", { keyPath: "bookId" });
        database.createObjectStore("pages", { keyPath: ["bookId", "page"] });
      });
      return new SearchIndexStore(db);
    } catch {
      return null;
    }
  }

  /** Cached pages for a book (empty if none, or if the cache format is outdated). */
  async load(bookId: string): Promise<Map<number, string>> {
    const tx = this.#db.transaction(["books", "pages"], "readwrite");
    const books = tx.objectStore("books");
    const pages = tx.objectStore("pages");

    const meta = await requestToPromise<BookMeta | undefined>(
      books.get(bookId),
    );
    if (!meta) return new Map();
    if (meta.version !== INDEX_VERSION) {
      books.delete(bookId);
      pages.delete(pageRange(bookId));
      await transactionDone(tx);
      return new Map();
    }

    books.put({ ...meta, lastUsed: Date.now() });
    const records = await requestToPromise<PageRecord[]>(
      pages.getAll(pageRange(bookId)),
    );
    await transactionDone(tx);
    return new Map(records.map((record) => [record.page, record.text]));
  }

  /** Adds pages to a book's cache (idempotent per page). */
  async save(
    bookId: string,
    entries: { page: number; text: string }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    const tx = this.#db.transaction(["books", "pages"], "readwrite");
    const pages = tx.objectStore("pages");
    for (const { page, text } of entries)
      pages.put({ bookId, page, text } satisfies PageRecord);
    tx.objectStore("books").put({
      bookId,
      version: INDEX_VERSION,
      lastUsed: Date.now(),
    } satisfies BookMeta);
    await transactionDone(tx);
    await this.#evict();
  }

  async #evict(): Promise<void> {
    const metas = await requestToPromise<BookMeta[]>(
      this.#db.transaction("books", "readonly").objectStore("books").getAll(),
    );
    if (metas.length <= MAX_CACHED_BOOKS) return;

    const stale = metas
      .toSorted((a, b) => a.lastUsed - b.lastUsed)
      .slice(0, metas.length - MAX_CACHED_BOOKS);
    const tx = this.#db.transaction(["books", "pages"], "readwrite");
    for (const { bookId } of stale) {
      tx.objectStore("books").delete(bookId);
      tx.objectStore("pages").delete(pageRange(bookId));
    }
    await transactionDone(tx);
  }
}
