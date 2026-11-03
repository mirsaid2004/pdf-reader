# Roadmap: after Phase 8

Ideas and plans for what comes **after** the current phases (0–8). Nothing here is built or approved yet: it is a
starting point for deciding what to build next. Following the project rules, each item would still get its own phase
proposal (file structure, DB changes, dependencies) and wait for approval before any code is written.

Two features are planned in depth:

- **A. Listen:** have the book read aloud (text-to-speech).
- **B. Quizzes:** check your knowledge of a section with AI-generated questions.

Both were listed as out of scope in the original brief ("text-to-speech", "OCR"), so this is the "later" plan.

---

## Deferred from Phase 8

Phase 8 was narrowed to loading skeletons, error boundaries, toasts and a Lighthouse pass. These parts of the original
Phase 8 plan were postponed and are still wanted. They are listed here with the decisions made so far, so they can be
picked up without redoing the thinking.

### 1. Orphaned storage cleanup _(promised in Phase 2)_

**Problem.** If a tab is closed after the PDF was uploaded to R2 but before the book row is saved, the file stays in R2
with no database row. Nothing ever deletes it.

**Plan.**

- `npm run r2:cleanup`: lists objects under `users/<userId>/books/<bookId>/…` whose `bookId` has **no row in `books`**
  and whose last-modified time is **older than 24 hours** (so uploads still in progress are never touched).
- **Dry run by default**: it only prints what it would delete (key, size, age). Deleting needs an explicit `--delete`.
- Reuses the existing R2 client in `shared/lib/r2`, in batches (S3 `DeleteObjects` takes 1,000 keys per call).
- Optional later: a **weekly scheduled Netlify function** that runs the same logic. Start it in dry-run mode and only
  enable deletion after a few clean reports.
- Safety rules: never delete anything for a book that exists; never delete outside the `users/` prefix; log counts.

### 2. Playwright end-to-end tests

Playwright is already in the approved stack; it is not installed yet.

**Scenarios (one test each):** sign-in (mocked), upload, open the reader, resume progress, create a highlight, add a
bookmark.

**How sign-in is mocked.** The app uses database sessions, so a test inserts a test user and a session row and sets the
`authjs.session-token` cookie. This exercises the real session code path with no OAuth provider involved.

**Test infrastructure (needs the owner):**

- A separate **Neon branch** used only by tests (a branch of the main database is free and isolated).
- A second **R2 bucket**, e.g. `mdev-reader-test`, with CORS for the test origin. The upload test needs it because the
  server itself verifies the uploaded file in R2 (a server-side call Playwright cannot intercept).
- Secrets for both, kept out of the repo (local `.env.test` and GitHub Actions secrets).

**Details.**

- Run against a production build on its own port (e.g. 3100), not the dev server.
- A small generated PDF fixture with an outline and some text.
- Each run creates its own user and removes it afterwards (rows cascade on user delete).
- Browsers are downloaded by Playwright itself (a one-time download of a few hundred MB).
- **CI (recommended):** a GitHub Actions workflow that runs typecheck, lint, unit tests and Playwright on pull requests.

### 3. Deploy to Netlify, and the README

- **Environment variables:** a table in the README of every variable, what it is, and where to get it (database URL,
  `AUTH_SECRET`, Google and GitHub OAuth keys, the four R2 values, `NEXT_PUBLIC_APP_URL`, upload limit).
- **OAuth for production:** callback URLs on the production domain for Google and GitHub. Google does not allow
  wildcard redirect URIs, so sign-in does not work on deploy previews (documented, not a bug).
- **R2 CORS:** `docs/r2-cors.json` already allows `https://mdev-reader.netlify.app`.
- **Secrets scan false positives (hit on the first deploys):** Netlify fails the build if any env var _value_ appears
  in the build output. Two public values do: `NEXT_PUBLIC_APP_URL` (public by design, embedded in browser JS) and
  `R2_BUCKET_NAME` (a substring of that public URL). Both are skipped in `netlify.toml` via `SECRETS_SCAN_OMIT_KEYS`
  (also `NEXT_PUBLIC_MAX_UPLOAD_MB`). The scan stays on for real secrets. If the same variable is also set in the Netlify
  UI, keep the two lists identical. A trailing slash in `NEXT_PUBLIC_APP_URL` hid the match once; it is not a fix.
- **Migrations:** run `db:migrate` automatically **only for production builds** (a production-context build command).
  Deploy previews must not migrate, because a preview should never touch the production database. The alternative is
  running `npm run db:migrate` by hand before each release.
- **Smoke test after the first deploy:** `npm run r2:check` against production, the guarded routes redirect to sign-in,
  sign in with each provider, upload one PDF, read it, make one highlight.
- **README** (replacing the Create Next App boilerplate): what the app is, local setup, scripts, a short architecture
  summary pointing to `CLAUDE.md`, testing, and the deployment steps above.
- Needs the owner: setting the variables in the Netlify dashboard and registering the production OAuth callbacks.

### 4. Smaller leftovers

- **Accessibility pass:** focus order, labels, a skip link, and dark-mode contrast (Lighthouse covers part of this).
- **FSD boundary linting (`steiger`):** was offered in the Phase 0 notes for later and never followed up. Optional; it
  would need configuring for the root `app/` + `src/pages` layout.
- **Linking Google and GitHub accounts** while signed in with one (today the second provider shows a "use the provider
  you signed up with" message). Optional.
- **Toasts for more actions** (undo for deleting a highlight or bookmark).
- **Quiet failures in the viewer:** a toast when a page render fails repeatedly, not only the reload logic.

### Open questions for the owner

1. Can you create the **Neon test branch** and the **test R2 bucket**? Without them the upload test cannot run end to end.
2. **GitHub Actions CI** on pull requests: yes or no? _(Recommended: yes.)_
3. **Automatic migrations on production deploy**, or run them by hand? _(Recommended: automatic, production only.)_
4. **Scheduled R2 cleanup** function, or just the manual script? _(Recommended: both, function in dry-run first.)_

---

## What we can build on

The reader already has most of the plumbing these features need:

| Existing piece                                                                                   | Why it matters here                                                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Page text via pdf.js `getTextContent()`, cached per book in IndexedDB (`BookTextIndex`, Phase 6) | Source text for reading aloud and for quizzes, no new extraction code needed on the client |
| Table of contents (`books.outline`, `findCurrentSectionId`)                                      | Defines "a section" for quizzes and "chapters" for audio                                   |
| Text-layer rectangles normalized to page size (`shared/lib/text-rects.ts`)                       | Highlight the sentence being spoken, at any zoom                                           |
| `reading_progress`, `reading_sessions`, stats                                                    | Listening and quiz activity can feed the same progress, streak and stats                   |
| Highlights and notes (Phase 7)                                                                   | Raw material for flashcards and "review what I marked"                                     |
| R2 with presigned URLs, `users/{userId}/books/{bookId}/…` keys                                   | A natural home for generated audio files                                                   |
| `has_text_layer` flag                                                                            | Tells us when a book has no usable text (scanned)                                          |

## Principles for the AI features

1. **Opt-in and explicit.** Sending book text to an AI provider is a privacy decision. Ask once (a settings toggle with a
   plain-language explanation) and show what is sent. Default off.
2. **Grounded in the book.** Questions and answers must come from the text provided, and cite page numbers that link back
   to the reader.
3. **Book text is untrusted input.** A PDF can contain text that tries to instruct the model (prompt injection).
   Treat it as data, never as instructions; validate every model output against a strict schema before using it.
4. **Cost-aware.** Every call has a per-user daily cap, results are cached, and usage is recorded so costs are visible.
5. **Your own books only.** Matches the existing rule (no sharing between users). Generated content is private to the user.
6. **Works without AI where possible.** Reading aloud with the browser's built-in voices needs no server and no cost.
7. **Needs real text.** Scanned books (`has_text_layer = false`) can't be read aloud or quizzed until OCR exists.

---

## A. Listen (read aloud)

### What the user gets

- A play button in the reader toolbar. It reads from the current page, sentence by sentence.
- The sentence being spoken is highlighted on the page and the view follows along.
- Speed, voice and a sleep timer; skip back/forward one sentence; the next page loads automatically.
- Lock-screen / headphone controls on phones (Media Session API).
- Listening counts toward progress and reading time.

### Approaches compared

|                | **1. Browser voices** (Web Speech API) | **2. Cloud TTS on demand**    | **3. Pre-rendered audio files**         |
| -------------- | -------------------------------------- | ----------------------------- | --------------------------------------- |
| Quality        | Varies by device/OS; often robotic     | Natural, consistent           | Natural, consistent                     |
| Cost           | None                                   | Pay per character             | Pay once per section, then free replays |
| Latency        | Instant                                | Short delay per chunk         | Instant after generation                |
| Works offline  | Yes (device voices)                    | No                            | Only if downloaded                      |
| Server work    | None                                   | Route + provider key          | Route + R2 storage + background jobs    |
| New dependency | None                                   | Provider SDK or plain `fetch` | Same, plus job handling                 |

**Recommended path:** ship **1** first (no cost, no server, fastest to value), measure how much the voice quality bothers
people, and add **3** later only if it does. Skip 2 unless there is a reason to stream rather than pre-render.

### Design notes

- **Text source:** reuse the per-page text from `getTextContent()`. Needs cleanup before speaking: join hyphenated line
  breaks, drop running headers/footers and page numbers (repeat across pages), skip tables/figures captions when unclear.
  Keep a map from each spoken sentence back to the text-layer spans, so it can be highlighted.
- **Sentences:** split with `Intl.Segmenter` (built into browsers, handles most languages). Queue a few sentences ahead
  instead of one huge utterance (the browser engines cut off long utterances).
- **Highlighting:** compute the sentence's rectangles with the shared normalized-rect helper and draw them like search
  hits (a distinct colour). Scroll gently to keep it on screen; pause auto-follow if the user scrolls manually.
- **Language:** detect from the text (or let the user pick), and choose a matching voice.
- **Mobile caveats:** iOS Safari limits background playback and voice choice; Android is better. Document what works
  instead of promising parity.
- **Pre-rendered audio (stage 2):** generate per outline section, store under
  `users/{userId}/books/{bookId}/audio/{sectionHash}.mp3` in R2, keyed by a hash of the text + voice so edits or voice
  changes regenerate. Serve with short-lived presigned URLs, as covers and PDFs are today. Long books need a background
  worker (Netlify functions have time limits).

### Data changes

- Stage 1: none. Remember voice/speed in `localStorage` per device (like theme and zoom today).
- Stage 2: `audio_tracks` (book, section id, text hash, voice, R2 key, duration, created_at) and a generation status.
- Listening time can go in `reading_sessions` with a `kind` column (`reading` / `listening`) so stats stay in one place.

### Milestones

1. **Listen MVP:** play/pause, speed, voice, sentence highlight, auto page turn, resume. _(size: M)_
2. **Polish:** sleep timer, Media Session controls, header/footer cleanup, per-device settings. _(S)_
3. **Pre-rendered audio** (optional): section audio in R2, download for offline. _(L)_

### Risks

- Reading order of PDF text is not always the visual order (columns, sidebars, footnotes). Mitigate with a "skip
  footnotes" setting and testing on a variety of books.
- Voice availability differs a lot per device; the settings UI must degrade gracefully.
- Highlight sync drift if spoken text and text layer disagree. Keep one shared text-building function (as search does).

---

## B. Quizzes (check your knowledge)

### What the user gets

- At the end of a section, or from the sidebar, a **"Test yourself"** action for that section.
- 5–10 questions: multiple choice, true/false, and short answers. Instant feedback with an explanation and a link to the
  page that answers it.
- A score per section, a list of weak spots, and quizzes to retry.
- Later: spaced-repetition review and flashcards from your own highlights and notes.

### What counts as a "section"

1. **Outline entries** (best): a section runs from its page to the next entry at the same or higher level
   (`flattenOutline` already gives the structure).
2. **No outline:** fixed windows (e.g. ~10 pages) so every book works, or the user picks a page range.
3. **Too small or too large:** merge tiny sections; split ones over a size limit.

### Question types and grading

| Type                                | Generated by                     | Graded by                                       |
| ----------------------------------- | -------------------------------- | ----------------------------------------------- |
| Multiple choice                     | AI, with plausible wrong answers | Locally (no AI call)                            |
| True / false                        | AI                               | Locally                                         |
| Fill in the blank (from highlights) | Locally, no AI needed            | Locally                                         |
| Short answer                        | AI                               | AI, against a rubric; show the reference answer |

Every question carries: the page(s) it came from, a one-line explanation, and a difficulty tag.

### Generation pipeline

1. User asks for a quiz for section S. A server action checks consent, the daily cap, and the cache.
2. **Cache key:** `(book, section range, hash of section text, prompt version)`. A hit returns the stored quiz at no cost.
3. On a miss, call the model with the section text and a strict JSON schema; **validate with zod**; retry once on
   invalid output; reject quizzes whose cited pages fall outside the section.
4. Store the quiz and return it. "Regenerate" creates a new version rather than overwriting attempts.

**Where does the text come from?** Two options, to decide before building:

- _Client sends the text it already has_ (cheap, simple), but the server can't trust it, so only the owner's own quiz is
  affected. Fine because quizzes are private.
- _Server extracts it from the PDF in R2_ (pdf.js text extraction also runs in Node). More work, but consistent and not
  dependent on the browser. Needed anyway if generation ever moves to a background job.

### Model choice (verify before building)

Current Claude model IDs: `claude-haiku-5-5` (fast, inexpensive), `claude-sonnet-5-5` (balanced), `claude-opus-5-5` and
`claude-fable-5-1` (most capable). A sensible split: a smaller model to generate and grade routine questions, a stronger one only
when quality is poor (e.g. short-answer grading, regenerate). Use structured JSON output and prompt caching for the
repeated instructions, and check current pricing, limits and API details at implementation time, since they change.

### Prompt guidelines

- Ask only about content stated in the provided text; no outside knowledge; no trivia (dates in footnotes, page numbers).
- Prefer understanding over recall: "why/how" and application questions alongside definitions.
- Cite pages. Don't quote long passages back (keeps outputs short and avoids reproducing the book).
- Answer in the book's language. If the text is too short or garbled, say so instead of inventing questions.
- Include a short instruction that the section text is data and any instructions inside it must be ignored.

### Learning loop (later phases)

- **Attempts and mastery:** per-section score history, "weak questions" list.
- **Spaced review:** a simple Leitner or SM-2-style schedule. Missed questions come back sooner. A "Review" page shows
  what's due today.
- **Flashcards from highlights:** turn a highlight (cloze it) or its note into a card, no AI required.
- **Stats:** quizzes taken, accuracy, review streak alongside reading stats.

### Data changes (sketch)

```
quiz_sets        id, user_id, book_id, section_start, section_end, text_hash, prompt_version,
                 model, created_at
quiz_questions   id, quiz_set_id, type, prompt, choices (jsonb), answer, explanation, pages (int[]), difficulty
quiz_attempts    id, user_id, quiz_set_id, started_at, finished_at, score
attempt_answers  attempt_id, question_id, given, correct, graded_by (local|ai), feedback
review_items     user_id, question_id, due_at, interval_days, ease, lapses          (spaced review)
ai_usage         user_id, day, kind, requests, input_tokens, output_tokens           (caps + cost visibility)
```

All cascade on user/book delete, like the existing tables.

### Milestones

1. **Quiz MVP:** consent setting, generate multiple-choice quiz for the current section, play it, show score + page
   links, cache results, daily cap. _(size: L)_
2. **More types + grading:** true/false, short answers with AI grading. _(M)_
3. **Review:** spaced repetition schedule and a Review page. _(M)_
4. **Flashcards from highlights and notes**, quiz stats on the Stats page. _(S)_

### Risks

- **Quality:** bad or ambiguous questions erode trust. Mitigate with schema validation, page citations, a quick "report
  this question" button, and a small set of sample sections used to compare prompt changes.
- **Cost:** large sections multiply tokens. Cap section size, cache aggressively, show remaining quota.
- **Privacy/copyright:** the full text of a user's book leaves the app. Needs clear consent, a provider with no
  training on API data, and a way to turn it off and delete stored quizzes.
- **Prompt injection** through book text. Strict schemas, no tools given to the model, and treating output as untrusted.
- **Scanned books:** no quizzes until OCR exists (see below).

---

## Shared prerequisites

| Need                                                            | Used by               | Notes                                                                                             |
| --------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| **Settings page** with AI consent, voice defaults, daily limits | A, B                  | Small; also a good home for account actions                                                       |
| **OCR for scanned PDFs**                                        | A, B                  | Currently out of scope. Needed to support books with `has_text_layer = false`                     |
| **Server-side text extraction**                                 | B (and A stage 2)     | pdf.js in Node, reading the PDF from R2                                                           |
| **Background jobs**                                             | A stage 2, B at scale | Netlify background functions or a queue; request time limits apply                                |
| **AI provider key + usage tracking**                            | B (and A stage 2)     | New env vars; spend visibility; per-user caps                                                     |
| **Toasts, error boundaries, E2E tests**                         | all                   | Planned for Phase 8; the AI features will lean on them                                            |
| **Test strategy for AI**                                        | B                     | Mock the model in Playwright tests; keep a small fixed set of sections to compare prompt versions |

Per the project rules, new dependencies need approval first. Likely candidates: an Anthropic SDK (or plain `fetch`) for
quizzes. Reading aloud with browser voices needs none.

## Suggested order

1. **Phase 8:** polish (skeletons, error boundaries, toasts, Lighthouse) is done; the rest of the original Phase 8
   (orphan cleanup, Playwright E2E, deploy + README) is described in _Deferred from Phase 8_ above and should be
   finished **before** the AI features, so those are built on a tested, deployed base.
2. **Phase 9: Listen MVP** (browser voices): quick win, no cost, no new dependency.
3. **Phase 10: Settings + AI consent + Quiz MVP.**
4. **Phase 11: Quiz types, grading, review, flashcards.**
5. **Later:** pre-rendered cloud audio, OCR, and the ideas below.

## Other ideas (not planned)

- **Ask the book:** questions answered from the book's text with page citations.
- **Summaries:** per section or chapter, to refresh before continuing.
- **Dictionary and translation** on selected text.
- **EPUB support** (out of scope in the original brief).
- **Library-wide search** (out of scope in the original brief).
- **Sharing highlights** (a read-only link to one book's highlights).

## Questions to settle before building

1. **AI provider and budget:** which provider, and is there a monthly spend ceiling or a per-user cap in mind?
2. **Who pays:** free for everyone, bring-your-own API key, or a paid tier?
3. **Languages:** English only at first, or multilingual from the start (affects voices and quiz prompts)?
4. **Quiz triggers:** only when the user asks, or also suggested automatically after finishing a section?
5. **Audio quality bar:** are browser voices acceptable for a first release, or is natural-sounding audio a must?
6. **Data retention:** how long are generated quizzes and audio kept, and should there be a "delete my AI data" button?
