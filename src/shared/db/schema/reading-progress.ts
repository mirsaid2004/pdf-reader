import {
  integer,
  pgTable,
  primaryKey,
  real,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { books } from "./books";

// Written from Phase 5; the library reads it (left join) for progress bars.
export const readingProgress = pgTable(
  "reading_progress",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    currentPage: integer().notNull().default(1),
    /** 0–100 */
    percent: real().notNull().default(0),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bookId] })],
);
