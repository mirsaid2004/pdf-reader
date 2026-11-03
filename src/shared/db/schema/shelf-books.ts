import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { books } from "./books";
import { shelves } from "./shelves";

// No user_id here: actions verify that both the shelf and the book belong to
// the current user before inserting.
export const shelfBooks = pgTable(
  "shelf_books",
  {
    shelfId: uuid()
      .notNull()
      .references(() => shelves.id, { onDelete: "cascade" }),
    bookId: uuid()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.shelfId, t.bookId] }),
    index("shelf_books_book_id_idx").on(t.bookId),
  ],
);
