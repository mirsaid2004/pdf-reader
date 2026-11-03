# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

PDF book reader: users upload PDFs, read them in-browser, and sync progress, bookmarks, highlights, and notes across devices. Built in numbered phases (0 Setup → 1 Auth → 2 Upload → 3 Library → 4 Reader → 5 Progress → 6 TOC/search → 7 Bookmarks/highlights/stats → 8 Polish/E2E/deploy). Out of scope: EPUB, offline/PWA, library-wide full-text search, OCR, TTS, sharing.

## Working rules (from the project owner)

- One phase at a time, on its own branch (`phase-N-<name>`). Before coding a phase, propose the file structure and DB changes. After a phase, stop, summarize, list decisions, and wait for approval; the branch is merged to `main` only after approval.
- Ask before adding any dependency not already in the agreed stack: Next.js, Auth.js v5 + `@auth/drizzle-adapter`, Drizzle + `@neondatabase/serverless`, AWS SDK v3 (for R2), `pdfjs-dist` (or react-pdf, propose first), Tailwind, Playwright.
- TypeScript strict (plus `noUncheckedIndexedAccess`); no `any` unless unavoidable, with a comment explaining why. ESLint enforces `no-explicit-any` and `consistent-type-imports`.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (also type-checks)
npm run typecheck      # next typegen && tsc --noEmit (typegen is required: LayoutProps/PageProps are generated)
npm run lint           # eslint (flat config; `next lint` no longer exists)
npm run format         # prettier --write . (with Tailwind class sorting)
npm run format:check
npm run db:generate -- --name <migration_name>   # generate SQL migration from schema
npm run db:migrate     # apply migrations (reads .env.local via @next/env)
npm run db:push | db:studio
```

There is no test runner yet; Playwright E2E arrives in Phase 8.

## Next.js 16 specifics that matter here

- **`proxy.ts`** (root) replaces `middleware.ts`. Runs on Node by default.
- **`cacheComponents: true`**: any component reading cookies/headers/searchParams/session must be inside `<Suspense>`, or the build fails. Don't await the session at the top level of a layout. Pages take `searchParams` as a Promise and pass it into a suspended child.
- Auth.js calls `crypto.getRandomValues()` internally, so `getCurrentUser()` calls `await connection()` before `auth()`. Keep that ordering for any new request-time code that uses randomness.

## Architecture

### Feature-Sliced Design layout

- Root `app/` holds **Next.js routing only**. Route files are thin re-exports/wrappers of `src/pages/*` (e.g. `app/page.tsx` → `@/pages/home`).
- `src/` holds the FSD layers: `app` (global styles/providers) → `pages` → `widgets` → `features` → `entities` → `shared`. Import only downward. `@/*` maps to `./src/*`.
- The empty root `pages/` folder (with README) must stay: without it Next.js treats `src/pages` as the Pages Router and the build fails with "`pages` and `app` directories should be under the same folder".
- Slices expose a public `index.ts`. Server-only entity APIs are exposed separately via `server.ts` (e.g. `@/entities/shelf/server`) so client code never pulls in DB code.

### Auth (`src/shared/auth/`)

- The Auth.js instance lives in `shared` (not the FSD `app` layer) because features need `signIn`/`signOut`. Config is a lazy function so `next build` doesn't need env vars.
- Database session strategy. `proxy.ts` does only an **optimistic cookie-presence check** for `/library/*` and `/read/*`. The **authoritative check** is `requireUser()` / `getCurrentUser()` in `session.ts`; every protected page, server action, and route handler must call it (and later, check resource ownership against `user.id`).
- `routes.ts` contains no server-only code (the proxy imports it). It holds `sanitizeCallbackUrl()`, which must be used for any post-auth redirect.

### Database (`src/shared/db/`)

- All Drizzle tables live in `shared/db/schema/` (re-exported from `schema/index.ts`, which `drizzle.config.ts` points at). Tables are added in the phase that needs them.
- `casing: "snake_case"` is set in both the client and drizzle config: write camelCase property names with no explicit column names. Auth.js tables keep the adapter's expected property names (`providerAccountId`, `refresh_token`, …).
- `getDb()` is a lazy, memoized Neon **HTTP** driver client: no interactive transactions. UUID PKs with `defaultRandom()`. User-owned tables cascade on user delete; book-owned tables cascade on book delete.
- `shelves.kind` (`reading | want_to_read | finished`, null for custom shelves) identifies the 3 system shelves: they can be renamed but not deleted, and stats use `kind` rather than names. Defaults are inserted in Auth.js `events.createUser` and self-healed by `getUserShelves()`.

### Env

- Server vars: `getServerEnv(key)` from `@/shared/config/env` (server-only, validated lazily). Browser-safe values: `publicEnv` from `@/shared/config` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAX_UPLOAD_MB`). `.env.example` lists every variable.

### Planned architecture (upcoming phases; keep to these decisions)

- PDFs and covers live in a **private** Cloudflare R2 bucket; DB stores only keys and metadata. Uploads go **browser → R2 via presigned PUT**; never stream file bodies through Netlify functions. Reading uses short-lived presigned GET URLs issued after an ownership check. The bucket needs CORS for the app origin and must allow Range requests (pdf.js progressive loading).
- Cover thumbnail, page count, title/author, outline, and the `has_text_layer` check are extracted **client-side** with pdf.js at upload time (no server canvas).
- Highlight rects are stored normalized to page size (0–1). In-book search is client-side via `getTextContent()`, cached per book in IndexedDB.

## Deployment

Netlify (`netlify.toml`, Node 24). Auth needs `AUTH_TRUST_HOST=true`. Google OAuth doesn't accept wildcard redirect URIs, so sign-in doesn't work on deploy previews. GitHub OAuth apps accept up to 10 redirect URIs (localhost and production can share one app, but separate apps keep secrets isolated).
