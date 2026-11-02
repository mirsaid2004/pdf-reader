import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

/** Marks the system shelves every user gets. Custom shelves have `kind = null`. */
export const shelfKind = pgEnum("shelf_kind", [
  "reading",
  "want_to_read",
  "finished",
]);

export type ShelfKind = (typeof shelfKind.enumValues)[number];

export const DEFAULT_SHELVES: ReadonlyArray<{ kind: ShelfKind; name: string }> =
  [
    { kind: "reading", name: "Reading" },
    { kind: "want_to_read", name: "Want to read" },
    { kind: "finished", name: "Finished" },
  ];

export const shelves = pgTable(
  "shelves",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    kind: shelfKind(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Shelf names are unique per user, case-insensitively.
    uniqueIndex("shelves_user_id_name_ci_idx").on(
      t.userId,
      sql`lower(${t.name})`,
    ),
    // At most one shelf of each system kind per user (NULLs are distinct in Postgres).
    unique("shelves_user_id_kind_unique").on(t.userId, t.kind),
  ],
);
