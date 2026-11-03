# Roadmap: after Phase 8

Ideas and plans for what comes **after** the current phases (0–8). Nothing here is built or approved yet: it is a
starting point for deciding what to build next. Following the project rules, each item would still get its own phase
proposal (file structure, DB changes, dependencies) and wait for approval before any code is written.

Two features are planned in depth:

- **A. Listen:** have the book read aloud (text-to-speech).
- **B. Quizzes:** check your knowledge of a section with AI-generated questions.

Both were listed as out of scope in the original brief ("text-to-speech", "OCR"), so this is the "later" plan.

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

1. **Phase 8:** polish and ship (already planned).
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
