import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { HIGHLIGHT_COLORS } from "@/shared/lib/highlight-colors";
import type { NormalizedRect } from "@/shared/lib/text-rects";

import { users } from "./auth";
import { books } from "./books";

export const highlightColor = pgEnum("highlight_color", HIGHLIGHT_COLORS);

export const highlights = pgTable(
  "highlights",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    page: integer().notNull(),
    /** Boxes as fractions of the page size (0–1), so they're right at any zoom. */
    rects: jsonb().$type<NormalizedRect[]>().notNull(),
    text: text().notNull(),
    color: highlightColor().notNull().default("yellow"),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("highlights_user_id_book_id_page_idx").on(t.userId, t.bookId, t.page),
  ],
);
