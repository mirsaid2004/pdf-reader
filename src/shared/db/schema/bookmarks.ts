import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { books } from "./books";

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    page: integer().notNull(),
    label: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The toolbar button toggles a bookmark on the current page, so a page has at most one.
    unique("bookmarks_user_book_page_unique").on(t.userId, t.bookId, t.page),
    index("bookmarks_user_id_book_id_idx").on(t.userId, t.bookId),
  ],
);
