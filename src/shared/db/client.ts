import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/shared/config/env";

import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | undefined;

/**
 * Lazily created Drizzle client over Neon's HTTP driver (stateless, ideal for
 * serverless functions). Lazy so that importing this module during
 * `next build` doesn't require DATABASE_URL.
 */
export function getDb(): Database {
  instance ??= drizzle({
    client: neon(getServerEnv("DATABASE_URL")),
    schema,
    casing: "snake_case",
  });
  return instance;
}
