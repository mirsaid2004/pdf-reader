import "server-only";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { getDb } from "@/shared/db";
import { insertDefaultShelves } from "@/shared/db/default-shelves";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/shared/db/schema";

import { SIGN_IN_PATH } from "./routes";

// The config is built lazily (per request) so `next build` doesn't need
// DATABASE_URL. Providers read AUTH_{GOOGLE,GITHUB}_{ID,SECRET} automatically.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();

  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    session: { strategy: "database" },
    providers: [Google, GitHub],
    pages: {
      signIn: SIGN_IN_PATH,
      // Errors such as OAuthAccountNotLinked land on the sign-in page as ?error=...
      error: SIGN_IN_PATH,
    },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
    events: {
      async createUser({ user }) {
        if (user.id) await insertDefaultShelves(db, user.id);
      },
    },
  };
});
