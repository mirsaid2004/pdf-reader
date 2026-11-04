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

- **Shelf switching and search are client-side.** The page loads shelves + _all_ the user's books once (`getUserShelves` ‖ `getLibraryBooks`, one wall-clock round trip; each Neon HTTP query costs ~100+ ms, so never chain queries serially on a navigation path). `widgets/library-view` (client) holds `shelfId`/`q` state and filters in memory with `filterBooks()` (`entities/shelf`, case-insensitive substring on title/author); sidebar links intercept plain clicks. The view is mirrored into the URL (`/library?shelf=<id>&q=<text>`, `libraryHref()`) with `history.replaceState` only, so reload/links work but shelf clicks make no server request (and add no history entries). The page still validates `?shelf` against the user's shelves for the initial state.
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

### Bookmarks, highlights, notes, stats (Phase 7)

- **Bookmarks** (`features/toggle-bookmark`): one per (user, book, page) (unique constraint), so the toolbar button / `b` toggles. `toggleBookmark` inserts with `onConflictDoNothing().returning()`; no row back means it existed, so it deletes. Client hooks (`useBookmarks`, `useHighlights`) are **optimistic with rollback** and take an optional `actions` object (default = the real server actions) so they can be tested with in-memory fakes; `PdfReader` threads `bookmarkActions`/`highlightActions` through for that.
- **Highlights** (`features/highlight-text`): `captureSelection` splits the browser selection **per page** (a stored highlight belongs to one page; a cross-page selection becomes several rows in one `createHighlights` call, the note goes on the first), rebuilds the text from text nodes (line ends → spaces), and converts boxes to **normalized rects** (`shared/lib/text-rects.ts`; `mergeLineRects` groups boxes by line first, then joins left→right; duplicates of one line must not stack). `PageView` draws them below the text layer (`pointer-events-none`), so clicks are hit-tested from the saved rects: `pageAtPoint` + `findHighlightAt` in `ReaderView` (a tap on a highlight must not toggle the toolbar). Page elements carry `data-page`.
- **Colours** live in `shared/lib/highlight-colors.ts` (no DB imports, so the browser can use them) and feed the `highlight_color` pg enum.
- **Export**: `features/export-highlights/lib/markdown.ts` (pure, tested) + `GET /api/books/[bookId]/highlights/export` (owner only, attachment). The page `/books/[bookId]/highlights` is the read-only per-book view. Mutations call `revalidatePath("/books/[bookId]/highlights", "page")`.
- **Stats** (`entities/reading-stats`, `/stats`): all maths is pure and tested in `lib/stats.ts`: overlapping sessions merged (two tabs aren't double-counted), days bucketed **in the viewer's time zone** (cookie `tz` set by `TimezoneCookie`, validated server-side, UTC fallback), streak counts back from today or yesterday, "books finished" = books on the **Finished shelf** (so manual moves count). The chart (`widgets/pages-per-day-chart`) is server-rendered HTML/CSS (no chart library): single series, 24 px max bars, 4 px rounded tops, tooltip per day on hover and keyboard focus, table view; colours are the validated slot-1 pair in `globals.css` (`.viz-root`).
- `proxy.ts` also gates `/books/*` and `/stats` (optimistic cookie check; pages still call `requireUser`).

### Loading, errors, toasts (Phase 8)

- **Next 16 error API differs from older versions:** `error.tsx` / `global-error.tsx` receive `{ error: unknown, retry }` (**`retry`, not `reset`**; `error` is `unknown`, narrow it). `global-error.tsx` replaces the root layout, so it renders its own `<html>`/`<body>` and imports `globals.css`. For component-level boundaries use `catchError` from `next/error` (see `widgets/pdf-reader/ui/reader-error-boundary.tsx`): it handles `redirect()`/`notFound()` correctly and `retry()` keeps state outside the boundary. Server errors reach the client with a generic message and a `digest` that matches the server log; `ErrorScreen` shows it as a reference number.
- Route files: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, plus `error.tsx` and `loading.tsx` for library, read, stats and book highlights. They are thin wrappers over `shared/ui/error-screen.tsx` and the `*-skeleton.tsx` files in each `pages/*/ui`. Skeletons mirror the loaded layout (no layout jump), use `shared/ui/skeleton.tsx` (`Skeleton`, `LoadingRegion`: `role="status"` + screen-reader text) and respect `prefers-reduced-motion`.
- **Toasts** (`shared/ui/toast.tsx`, provider in the root layout, `z-[80]` so it sits above the full-screen reader): `useToast().toast({ kind, title, description })`. Max 3 on screen, auto-dismiss (errors stay 8 s), pause on hover/focus, errors are `role="alert"`, others `role="status"`. Convention: **failed server actions and successes use toasts; field validation stays inline** (duplicate shelf name, upload dialog states, sign-in errors). The optimistic hooks (`useBookmarks`, `useHighlights`) report failures through an `onError(message)` callback after rolling back.
- Cover images use `shared/ui/fade-in-image.tsx` (fades in once loaded; also handles images that finished before hydration).

### Client cache: returning to a page must not show a loading state

- Pages that read the session are "dynamic", and Next doesn't keep those in the browser's client cache by default (`staleTimes.dynamic` = 0), so coming back to the library re-fetched it behind the skeleton. `next.config.ts` sets **`experimental.staleTimes.dynamic: 1800`** so a visited page returns instantly for 30 minutes. (A `"use cache: private"` + `cacheLife({ stale })` function does **not** help: a route with a request-time read still counts as dynamic; verified on a production build.)
- Because that cache is global, anything shown from it can be old, so: (1) **library, stats, book highlights** render `<RefreshWhenStale renderedAt={serverNow()} />` (shared/ui): the cached page shows instantly and is refreshed in place if it is older than 15 s (an effect, so it also re-checks when a hidden route is shown again); (2) the **reader** must never start from an old copy (saved page, highlights, bookmarks are initial state), so `PdfReader` calls `useStaleOnMount(renderedAt, 15 s)` and shows the skeleton while it re-fetches. It compares against the mount time, so a reader kept alive in memory is never treated as stale; (3) after the tracker's **final save** on leaving the reader the hook calls `router.refresh()`, so the library/stats show what was just read (`dispose()` now resolves `true` only if something was saved).
- **Server Actions that call `refresh`/`revalidatePath`/`cookies.set` clear the whole client cache** (shelf, delete, upload, highlight actions, sign-in/out), so those never show stale data. Route handlers do not (the reading POST can't), hence the refresh above.
- `serverNow()` (shared/lib/server-time.ts) is the only place `Date.now()` is taken in server components (React's purity lint flags it elsewhere); call it only after reading request data.

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
