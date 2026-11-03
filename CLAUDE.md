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
npm run r2:check       # verifies R2 creds, presigned PUT/GET, Range, and bucket CORS for localhost + NEXT_PUBLIC_APP_URL
```

`npm run test:unit` runs plain-TypeScript unit tests with Node's built-in runner (`node --test`, Node 24 strips types; test files import with `.ts` extensions and mock timers via `node:test`). Playwright E2E arrives in Phase 8.

## Next.js 16 specifics that matter here

- **`proxy.ts`** (root) replaces `middleware.ts`. Runs on Node by default.
- **`cacheComponents: true`**: any component reading cookies/headers/searchParams/session must be inside `<Suspense>`, or the build fails. Don't await the session at the top level of a layout. Pages take `searchParams` as a Promise and pass it into a suspended child.
- **Hidden routes keep their state but lose their effects.** With `cacheComponents`, navigating away doesn't unmount a route: React hides it, preserving component state, but runs every effect **cleanup**; coming back re-runs the effects against the _old_ state. Any resource created in an effect and stored in state (e.g. the pdf.js document) must not stay in state after its cleanup destroys it. Reset it in the cleanup, and re-create it when the effect re-runs (see `usePdfDocument`). Test client features by navigating away and back, not just by loading once.
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

### Storage & uploads (`src/shared/lib/r2/`, `src/features/upload-book/`)

- R2 keys are `users/{userId}/books/{bookId}/{book.pdf|cover.webp|cover.jpg}` and are **always derived server-side** from the session user (`keys.ts`); never accept a key from the client.
- The S3 client sets `requestChecksumCalculation`/`responseChecksumValidation: "WHEN_REQUIRED"`. Without this, browser PUTs to presigned R2 URLs fail. Presigned PUTs sign `content-type` and `content-length`, so R2 rejects any other file.
- Upload flow: client validates and extracts metadata with pdf.js → `requestUpload` action (presign) → XHR PUTs (for progress) → `createBook` action (HEAD + `%PDF-` magic-byte check, then insert). Delete removes the DB row first, then R2 objects.
- Covers are served via `GET /api/books/[bookId]/cover` (ownership check → 302 to a presigned URL), rendered with `next/image` `unoptimized`.
- pdf.js (v6) is loaded only in the browser via `loadPdfjs()` (`shared/lib/pdfjs`), which sets `GlobalWorkerOptions.workerPort` once. In v6, `destroy()` is on `doc.loadingTask`, not the document.

### Library (`src/pages/library`, `widgets/library-sidebar`, `widgets/book-grid`)

- The view lives in the URL: `/library?shelf=<id>&q=<text>`. The page awaits `searchParams` inside a `<Suspense>` child, validates `shelf` against the user's own shelves (unknown id ⇒ "All books"), and passes `initialQuery` down to the client search box (no `useSearchParams`, which would need its own Suspense). Build URLs with `libraryHref()` from `@/entities/shelf`.
- Search is server-side `ILIKE` on title/author; `escapeLike()` makes `%`/`_` literal.
- Status shelves (`kind` = reading / want_to_read / finished) are **mutually exclusive per book**; `setBookShelf` enforces this inside `db.batch([...])` (the Neon HTTP driver has no `transaction()`, but `batch` is atomic). Custom shelves are free-form. System shelves can be renamed, not deleted (`deleteShelf` filters `kind IS NULL`).
- `BookCard` (entities) is display-only and receives actions via a `menu` slot, because FSD forbids entities importing features. `shared/ui/dropdown-menu.tsx` is the shared click-to-open menu.
- `reading_progress` exists but is only read (left join) until Phase 5 starts writing it.

### Reader (`src/widgets/pdf-reader`, route `app/read/[bookId]`)

- Server page (`pages/reader`): `requireUser` → `getReaderBook` (ownership; unknown/foreign ⇒ `notFound()`) → presigned GET (1 h, `features/read-book`) → client `<PdfReader>`. The client refreshes the URL every 45 min and on render errors via the `getBookReadUrl` action.
- pdf.js loads by URL with range requests (`disableAutoFetch: true`), so big books open fast. `ReaderView` is `fixed inset-0 z-50` to cover the global header and to be the Fullscreen API target.
- **Virtualization** (`use-virtual-pages.ts`): page sizes start as page 1's size and are corrected as pages report real sizes (`reportSize`); an _anchor_ (page + fraction) is restored in a layout effect after every layout change (size corrections, zoom, resize), so the view never jumps. Only pages within ~1.5 viewports are mounted. The scroller `el` is mutated via a ref (the React-compiler lint rejects mutating state-derived values).
- **`PageView`**: renders canvas and text layer off-screen then swaps them in (no flicker on zoom; old canvas is CSS-stretched meanwhile). Canvas area is capped (16 MP) and output scale ≤ 2. The text layer sizes itself from the `--total-scale-factor` CSS var on `.pdf-page`; styles are the minimal subset in `ui/text-layer.css` (not the 6,500-line `pdf_viewer.css`). Themes apply a CSS `filter` to the canvas host only, never the text layer.
- `?page=N` is kept in the URL via `history.replaceState` (DB persistence is Phase 5). Theme/zoom live in localStorage through `useStoredState`. Known limitation: the dark theme inverts images too.

### Reading progress & sessions (`src/features/track-reading`)

- Browser → `POST /api/books/[bookId]/reading` (route handler, not a server action, because it must work while a tab is closing: `fetch(..., { keepalive: true })`). Body = `{ page?, session? }`. The handler checks same-origin (`Sec-Fetch-Site`, falling back to `Origin`), then auth, size, JSON/zod, then ownership.
- `model/tracker.ts` is the brain: plain TS, no React/aliases (so it's unit-tested). Rules: page saves debounced 3 s; heartbeat 60 s; session ends after 5 min idle and the next activity starts a new one; sessions with < 5 s of activity aren't sent; `ended_at` = **last activity**, never "now". Page changes made _before the first real interaction_ are ignored (layout settling/scroll restoration must never write). Activity events are wheel/keydown/pointerdown/touchstart, **not `scroll`** (the reader scrolls programmatically).
- Session id is generated by the browser, so reports are idempotent upserts (`greatest(...)` so late/out-of-order reports only grow a session). The server recomputes `percent` from the real page count: page 1 = 0 %, last page = 100 %.
- Auto-shelving on the server (`save-report.ts`): first read past page 1 ⇒ Reading (unless already Finished); reaching the last page ⇒ Finished; both only on _transitions_. Shared exclusive-status-shelf logic lives in `entities/shelf/api/membership.ts`.
- Resume order in `pages/reader`: explicit `?page=N` > saved progress > page 1. After a save the route calls `revalidatePath("/library")` so progress bars update.

### Contents & in-book search (`features/table-of-contents`, `features/search-book`, `widgets/pdf-reader/ui/reader-sidebar.tsx`)

- The sidebar (Contents | Search tabs; Phase 7 adds Bookmarks | Highlights) is **docked** beside the page at ≥ 1024 px (state persisted in `reader:sidebar`; the page re-fits and the scroll anchor keeps your place) and an **overlay drawer** below that (not persisted; closes after a jump). Both panels stay mounted (`hidden`) so scroll/expanded/search state survive tab switches.
- Outline comes from `books.outline` (extracted at upload) via `getReaderBook` → `PdfReader` → `TocPanel`. Pure helpers in `table-of-contents/lib/outline.ts` (flatten, current section = greatest page ≤ current, deeper wins ties).
- Search: page text is read **lazily on first use** with `getTextContent()` (nearest pages first, cancellable/resumable), cached per book in IndexedDB (`index-store.ts`, raw API via `shared/lib/idb.ts`, LRU of 30 books, `INDEX_VERSION` to invalidate), searched in memory by `BookTextIndex` (plain TS, unit-tested). Text is **folded** (case, accents, ligatures via NFKD, whitespace collapsed) with `lib/fold.ts`; `foldPlain` and `foldWithMap` must stay identical (tested). Indexed text is built like the text layer: item strings concatenated + `"\n"` after `hasEOL` (pdf.js puts a `<br>` after such a span) — keep both sides in sync or hit numbers drift.
- Hits on the page: `computeSearchRects` rebuilds the page string from `textLayer.textDivs`/`textContentItemsStr`, finds matches, builds one DOM `Range` per span and converts to **rects normalized to page size** (`shared/lib/text-rects.ts`, reused for Phase 7 highlights). `PageView` draws them as a percent-positioned overlay _below_ the text layer; zoom needs no recomputation. Active hit scrolls into view once per `focusToken`.
- Reader keys: `t` Contents, `/` or Cmd/Ctrl+F Search (browser find is intentionally overridden: it only sees mounted pages), Esc closes the sidebar. Books with `has_text_layer = false` show a notice and no search box.

### Server actions

- Return `ActionResult<T>` (`shared/lib/action-result.ts`) instead of throwing: thrown errors are redacted in production. Validate input with zod (`unknown` in, `safeParse`). Use `getCurrentUser()` (not `requireUser()`, which redirects). Call `refresh()` from `next/cache` after mutations that change the current page.

### Env

- Server vars: `getServerEnv(key)` from `@/shared/config/env` (server-only, validated lazily). Browser-safe values: `publicEnv` from `@/shared/config` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAX_UPLOAD_MB`). `.env.example` lists every variable.

### Planned architecture (upcoming phases; keep to these decisions)

- PDFs and covers live in a **private** Cloudflare R2 bucket; DB stores only keys and metadata. Uploads go **browser → R2 via presigned PUT**; never stream file bodies through Netlify functions. Reading uses short-lived presigned GET URLs issued after an ownership check. The bucket needs CORS for the app origin and must allow Range requests (pdf.js progressive loading).
- Cover thumbnail, page count, title/author, outline, and the `has_text_layer` check are extracted **client-side** with pdf.js at upload time (no server canvas).
- Highlight rects are stored normalized to page size (0–1). In-book search is client-side via `getTextContent()`, cached per book in IndexedDB.

## Deployment

Netlify (`netlify.toml`, Node 24). Auth needs `AUTH_TRUST_HOST=true`. Google OAuth doesn't accept wildcard redirect URIs, so sign-in doesn't work on deploy previews. GitHub OAuth apps accept up to 10 redirect URIs (localhost and production can share one app, but separate apps keep secrets isolated).
