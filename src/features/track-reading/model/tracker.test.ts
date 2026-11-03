import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import {
  HEARTBEAT_MS,
  IDLE_MS,
  ReadingTracker,
  SAVE_DEBOUNCE_MS,
  type ReadingReport,
} from "./tracker.ts";

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function setup(options: { accept?: () => boolean; initialPage?: number } = {}) {
  const sent: ReadingReport[] = [];
  let ids = 0;
  const tracker = new ReadingTracker({
    initialPage: options.initialPage ?? 1,
    send: async (report) => {
      sent.push(structuredClone(report));
      return options.accept ? options.accept() : true;
    },
    newId: () => `session-${++ids}`,
  });
  return { tracker, sent };
}

describe("ReadingTracker", () => {
  beforeEach(() => {
    mock.timers.reset();
    mock.timers.enable({
      apis: ["setTimeout", "setInterval", "Date"],
      now: 1_000_000,
    });
  });

  it("writes nothing when the reader only opens the book", async () => {
    const { tracker, sent } = setup();
    mock.timers.tick(IDLE_MS * 2);
    await settle();
    await tracker.dispose();
    assert.equal(sent.length, 0);
  });

  it("ignores page changes made before the reader interacted", async () => {
    const { tracker, sent } = setup();
    tracker.pageChanged(2); // layout settling on open
    mock.timers.tick(SAVE_DEBOUNCE_MS * 2);
    await settle();
    await tracker.dispose();
    assert.equal(sent.length, 0);
  });

  it("debounces page saves until the reader stops changing pages", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    tracker.pageChanged(2);
    mock.timers.tick(2_000);
    tracker.pageChanged(3);
    mock.timers.tick(SAVE_DEBOUNCE_MS - 1);
    await settle();
    assert.equal(sent.length, 0);
    mock.timers.tick(1);
    await settle();
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.page, 3);
  });

  it("flushes pending changes immediately on dispose", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    tracker.pageChanged(7);
    await tracker.dispose();
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.page, 7);
  });

  it("does not save a page it already saved", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    tracker.pageChanged(2);
    mock.timers.tick(SAVE_DEBOUNCE_MS);
    await settle();
    await tracker.flush();
    await tracker.flush();
    assert.equal(sent.length, 1);
  });

  it("skips sessions shorter than 5 seconds but still saves the page", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    tracker.pageChanged(2);
    mock.timers.tick(3_000);
    await tracker.dispose();
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.page, 2);
    assert.equal(sent[0]?.session, undefined);
  });

  it("reports ended_at as the last activity, not the time of the flush", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    mock.timers.tick(20_000);
    tracker.activity(); // last activity at +20s
    mock.timers.tick(30_000); // 30s of silence
    await tracker.flush();
    const session = sent[0]?.session;
    assert.ok(session);
    assert.equal(session.endedAt - session.startedAt, 20_000);
  });

  it("heartbeats the session only when something changed", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    mock.timers.tick(10_000);
    tracker.activity();
    mock.timers.tick(HEARTBEAT_MS);
    await settle();
    assert.equal(sent.length, 1, "first heartbeat sends the session");
    mock.timers.tick(HEARTBEAT_MS);
    await settle();
    assert.equal(sent.length, 1, "no new activity, nothing to send");
    tracker.activity();
    mock.timers.tick(HEARTBEAT_MS);
    await settle();
    assert.equal(sent.length, 2);
  });

  it("ends the session after 5 idle minutes and starts a new one on activity", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    mock.timers.tick(30_000);
    tracker.activity();
    mock.timers.tick(IDLE_MS + 1_000);
    await settle();
    const firstId = sent.at(-1)?.session?.id;
    assert.equal(firstId, "session-1");

    tracker.activity(); // reader comes back
    mock.timers.tick(10_000);
    tracker.activity();
    await tracker.flush();
    assert.equal(sent.at(-1)?.session?.id, "session-2");
    assert.notEqual(sent.at(-1)?.session?.id, firstId);
  });

  it("counts distinct pages visited", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    for (const page of [2, 3, 2, 4]) tracker.pageChanged(page);
    mock.timers.tick(10_000);
    tracker.activity();
    await tracker.flush();
    assert.equal(sent.at(-1)?.session?.pagesRead, 4); // 1, 2, 3, 4
  });

  it("does not send the same page twice while a request is in flight", async () => {
    const { tracker, sent } = setup();
    tracker.activity();
    tracker.pageChanged(2);
    mock.timers.tick(SAVE_DEBOUNCE_MS); // debounce fires, request starts
    void tracker.flush(); // e.g. the tab closes before the first request settles
    await settle();
    assert.equal(sent.length, 1);
  });

  it("keeps a failed save pending and retries it on the next flush", async () => {
    let accept = false;
    const { tracker, sent } = setup({ accept: () => accept });
    tracker.activity();
    tracker.pageChanged(5);
    mock.timers.tick(SAVE_DEBOUNCE_MS);
    await settle();
    assert.equal(sent.length, 1);
    accept = true;
    await tracker.flush();
    assert.equal(sent.length, 2);
    assert.equal(sent[1]?.page, 5);
    await tracker.flush();
    assert.equal(sent.length, 2, "saved once accepted");
  });
});
