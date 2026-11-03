// Plain TypeScript (no React, no path aliases, erasable syntax only) so it can
// be unit-tested directly with `node --test`.

export const SAVE_DEBOUNCE_MS = 3_000;
export const HEARTBEAT_MS = 60_000;
export const IDLE_MS = 5 * 60_000;
/** Sessions with less activity than this aren't worth a row. */
export const MIN_SESSION_MS = 5_000;

export type SessionReport = {
  id: string;
  startedAt: number;
  /** Time of the last user activity (never "now"). */
  endedAt: number;
  pagesRead: number;
};

export type ReadingReport = {
  page?: number;
  session?: SessionReport;
};

/** Resolves true when the server accepted the report. */
export type SendReport = (report: ReadingReport) => Promise<boolean>;

type Session = {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  pages: Set<number>;
  /** Signature of the last report the server accepted. */
  sentSignature: string | null;
  /** Signature of a report currently being sent. */
  inflightSignature: string | null;
};

type TrackerOptions = {
  /** The page the reader opens on; assumed to already be saved. */
  initialPage: number;
  send: SendReport;
  newId: () => string;
};

/**
 * Decides *when* to tell the server about reading progress and sessions.
 *
 * - A page change the reader makes is saved after SAVE_DEBOUNCE_MS of quiet.
 *   Page changes before the reader has interacted (layout settling on open)
 *   are ignored, so opening a book never writes anything by itself.
 * - A session starts when the tracker is created and ends after IDLE_MS
 *   without activity; the next activity starts a new session.
 * - Session reports are heartbeated every HEARTBEAT_MS and flushed on demand.
 */
export class ReadingTracker {
  #send: SendReport;
  #newId: () => string;
  #currentPage: number;
  #savedPage: number;
  #pendingPage: number | null = null;
  #inflightPage: number | null = null;
  #interacted = false;
  #session: Session | null = null;
  #saveTimer: ReturnType<typeof setTimeout> | undefined;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #heartbeat: ReturnType<typeof setInterval> | undefined;
  #disposed = false;

  constructor(options: TrackerOptions) {
    this.#send = options.send;
    this.#newId = options.newId;
    this.#currentPage = options.initialPage;
    this.#savedPage = options.initialPage;
    this.#startSession();
  }

  /** The reader did something (wheel, key, tap, click). */
  activity(): void {
    if (this.#disposed) return;
    this.#interacted = true;
    if (!this.#session) this.#startSession();
    else this.#session.lastActivityAt = Date.now();
  }

  /** The page the reader is on changed (from scrolling, buttons, keys…). */
  pageChanged(page: number): void {
    if (this.#disposed || page === this.#currentPage) return;
    this.#currentPage = page;
    if (!this.#interacted) return; // not the reader's doing (e.g. layout settling)

    this.#session?.pages.add(page);
    this.#pendingPage = page;
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /**
   * Sends whatever is new, now. The request starts synchronously (important
   * while a tab is closing). Reports already in flight aren't sent twice, and
   * failed sends stay pending and are retried by the next flush.
   */
  async flush(): Promise<void> {
    clearTimeout(this.#saveTimer);

    const report: ReadingReport = {};
    const page = this.#pendingPage;
    if (
      page !== null &&
      page !== this.#savedPage &&
      page !== this.#inflightPage
    ) {
      report.page = page;
    }

    const session = this.#session;
    let signature: string | null = null;
    if (
      session &&
      session.lastActivityAt - session.startedAt >= MIN_SESSION_MS
    ) {
      signature = `${session.lastActivityAt}:${session.pages.size}`;
      if (
        signature !== session.sentSignature &&
        signature !== session.inflightSignature
      ) {
        report.session = {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.lastActivityAt,
          pagesRead: session.pages.size,
        };
      }
    }
    if (report.page === undefined && report.session === undefined) return;

    if (report.page !== undefined) this.#inflightPage = report.page;
    if (report.session && session) session.inflightSignature = signature;

    let accepted = false;
    try {
      accepted = await this.#send(report);
    } catch {
      accepted = false;
    }

    if (report.page !== undefined) {
      if (this.#inflightPage === report.page) this.#inflightPage = null;
      if (accepted) {
        this.#savedPage = report.page;
        if (this.#pendingPage === report.page) this.#pendingPage = null;
      }
    }
    if (report.session && session) {
      if (session.inflightSignature === signature)
        session.inflightSignature = null;
      if (accepted) session.sentSignature = signature;
    }
  }

  /** Final flush and stop all timers (reader closed or hidden). */
  dispose(): Promise<void> {
    const done = this.flush();
    this.#disposed = true;
    this.#stopTimers();
    this.#session = null;
    return done;
  }

  #startSession(): void {
    const now = Date.now();
    this.#session = {
      id: this.#newId(),
      startedAt: now,
      lastActivityAt: now,
      pages: new Set([this.#currentPage]),
      sentSignature: null,
      inflightSignature: null,
    };
    this.#heartbeat = setInterval(() => void this.flush(), HEARTBEAT_MS);
    this.#scheduleIdleCheck(IDLE_MS);
  }

  #scheduleIdleCheck(delay: number): void {
    clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => {
      const session = this.#session;
      if (!session) return;
      const idleFor = Date.now() - session.lastActivityAt;
      if (idleFor >= IDLE_MS) {
        void this.flush(); // writes the final ended_at = last activity
        this.#session = null;
        clearInterval(this.#heartbeat);
        this.#heartbeat = undefined;
      } else {
        this.#scheduleIdleCheck(IDLE_MS - idleFor);
      }
    }, delay);
  }

  #stopTimers(): void {
    clearTimeout(this.#saveTimer);
    clearTimeout(this.#idleTimer);
    clearInterval(this.#heartbeat);
  }
}
