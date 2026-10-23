import test from "node:test";
import assert from "node:assert/strict";
import { compareCalls, mergeCallHistory, groupCallsByDay, callDescription } from "../components/calls/callHistoryModel.js";
import { callText } from "../components/calls/callText.js";
import { history } from "../convex/calls.js";
import schema from "../convex/schema.js";

const row = (createdAt, _id = String(createdAt), extra = {}) => ({ _id, _creationTime: createdAt, createdAt, ...extra });
const stream = (results, status = "Exhausted") => ({ results, status });
const ids = merged => merged.calls.map(call => call._id);

test("merge waits for both first pages, hides unsafe older rows, and advances the newest unfinished boundary", () => {
  const incoming = stream([row(100), row(90)], "CanLoadMore"), outgoing = stream([row(99), row(10)], "CanLoadMore");
  let merged = mergeCallHistory(incoming, outgoing);
  assert.deepEqual(ids(merged), ["100", "99", "90"]);
  assert.deepEqual(merged.next, ["incoming"]);
  assert.equal(merged.exhausted, false);
  assert.deepEqual(ids(mergeCallHistory(stream([row(500)], "LoadingFirstPage"), outgoing)), []);
  incoming.results.push(row(80), row(5));
  merged = mergeCallHistory(incoming, outgoing);
  assert.deepEqual(ids(merged), ["100", "99", "90", "80", "10"]);
  assert.deepEqual(merged.next, ["outgoing"]);
  assert.deepEqual(ids(mergeCallHistory(stream(incoming.results), stream(outgoing.results))), ["100", "99", "90", "80", "10", "5"]);
});

test("empty unfinished streams offer continuation; exhausted empty directions do not hide history", () => {
  let merged = mergeCallHistory(stream([], "CanLoadMore"), stream([row(20)]));
  assert.deepEqual(ids(merged), []); assert.deepEqual(merged.next, ["incoming"]);
  assert.deepEqual(ids(mergeCallHistory(stream([]), stream([row(20)]))), ["20"]);
  merged = mergeCallHistory(stream([], "LoadingMore"), stream([row(20)]));
  assert.equal(merged.loading, true); assert.deepEqual(merged.next, []);
  assert.equal(mergeCallHistory(stream([]), stream([])).exhausted, true);
});

test("identical dates use creation-time/ID ties; overlapping rows deduplicate without grouping repeated calls", () => {
  const a = row(50, "a", { _creationTime: 3 }), b = row(50, "b", { _creationTime: 2 });
  const c = row(50, "c", { _creationTime: 2 });
  assert.deepEqual([b, a, c].sort(compareCalls).map(call => call._id), ["a", "c", "b"]);
  assert.deepEqual(ids(mergeCallHistory(stream([a, b], "CanLoadMore"), stream([a, c], "CanLoadMore"))), ["a", "c"]);
  assert.deepEqual(ids(mergeCallHistory(stream([a, b]), stream([a, c]))), ["a", "c", "b"]);
});

test("reactive insertion and status/profile changes replace the same call without duplicating it", () => {
  const first = row(10, "call", { status: "ringing" });
  assert.equal(mergeCallHistory(stream([first]), stream([])).calls[0].status, "ringing");
  const updated = { ...first, status: "ended", peer: { fullName: "Updated Name" } };
  const merged = mergeCallHistory(stream([row(20, "new"), updated]), stream([]));
  assert.deepEqual(ids(merged), ["new", "call"]);
  assert.equal(merged.calls[1].peer.fullName, "Updated Name");
});

test("local-day sections handle midnight/month/year transitions and Arabic labels", () => {
  const now = new Date(2026, 0, 1, 0, 1).getTime();
  const calls = [row(now, "today"), row(new Date(2025, 11, 31, 23, 59).getTime(), "yesterday"), row(new Date(2025, 11, 30, 12).getTime(), "older")];
  const groups = groupCallsByDay(calls, now, "en", callText.en);
  assert.deepEqual(groups.map(g => g.data[0]._id), ["today", "yesterday", "older"]);
  assert.equal(groups[0].title, "Today"); assert.equal(groups[1].title, "Yesterday");
  assert.match(groups[2].title, /December/);
  assert.equal(groupCallsByDay(calls, now, "ar", callText.ar)[0].title, "اليوم");
  const tomorrow = new Date(2026, 0, 2, 0, 1).getTime();
  assert.equal(groupCallsByDay([calls[0]], tomorrow, "en", callText.en)[0].title, "Yesterday");
});

test("only incoming missed calls are red; failed/rejected/cancelled calls keep their own labels", () => {
  for (const direction of ["incoming", "outgoing"]) {
    const missed = callDescription({ direction, status: "missed" }, callText.en);
    assert.equal(missed.missed, direction === "incoming");
    assert.match(missed.label, direction === "incoming" ? /Missed call/ : /No answer/);
    for (const [status, outcome, label] of [["rejected", "declined", /declined/], ["failed", "connection_failed", /could not connect/], ["ended", "cancelled", /cancelled/]]) {
      const result = callDescription({ direction, status, outcome }, callText.en);
      assert.equal(result.missed, false); assert.match(result.label, label);
    }
  }
  assert.match(callDescription({ direction: "incoming", status: "missed" }, callText.ar).label, /فائتة/);
});

test("duration requires verified connection timestamps and a completed call", () => {
  const call = { status: "ended", outcome: "completed", direction: "outgoing", startedAt: 1000, endedAt: 126000 };
  assert.match(callDescription(call, callText.en).label, /2:05/);
  for (const overrides of [{ startedAt: undefined }, { endedAt: undefined }, { endedAt: 0 }, { outcome: "cancelled" }, { status: "accepted" }]) {
    assert.doesNotMatch(callDescription({ ...call, ...overrides }, callText.en).label, /\d+:\d{2}/);
  }
});

test("history derives the indexed owner from Clerk, preserves pagination metadata and current peer fields", async () => {
  const tables = JSON.parse(schema.export()).tables;
  const viewer = { _id: "viewer", clerkId: "clerk_viewer", isActive: true };
  const peer = { _id: "peer", fullName: "Full Name", imageUrl: "https://example.com/avatar.png" };
  const reads = [];
  const ctx = { auth: { getUserIdentity: async () => ({ subject: "clerk_viewer" }) }, db: {
    async get(table, id) { assert.equal(table, "users"); return id === "peer" ? peer : null; },
    query(table) {
      const equalities = [];
      return {
        withIndex(name, build) {
          const index = tables.find(t => t.tableName === table).indexes.find(i => i.indexDescriptor === name);
          assert.ok(index);
          const builder = { eq(key, value) { assert.equal(key, index.fields[equalities.length]); equalities.push([key, value]); return builder; } };
          build(builder); reads.push({ table, name, equalities }); return this;
        },
        async unique() { return viewer; },
        order(direction) { assert.equal(direction, "desc"); return this; },
        async paginate(options) {
          assert.equal(options.maximumRowsRead, 50); assert.equal(options.endCursor, "end");
          const incoming = equalities[0][0] === "receiverId";
          return { page: [row(20, "call", { callerId: incoming ? "peer" : "viewer", receiverId: incoming ? "viewer" : "peer" })],
            continueCursor: "next", isDone: false, splitCursor: "split", pageStatus: "SplitRecommended" };
        },
      };
    },
  } };
  for (const direction of ["incoming", "outgoing"]) {
    const result = await history._handler(ctx, { direction, paginationOpts: { numItems: 20, cursor: null, endCursor: "end" } });
    assert.equal(result.page[0].direction, direction); assert.deepEqual(result.page[0].peer, peer);
    assert.equal(result.splitCursor, "split"); assert.equal(result.continueCursor, "next");
    assert.deepEqual(reads.at(-1).equalities, [[direction === "incoming" ? "receiverId" : "callerId", "viewer"]]);
    assert.equal(reads.at(-1).name, direction === "incoming" ? "by_receiver_created" : "by_caller_created");
  }
  for (const numItems of [0, 51, 1.5]) await assert.rejects(history._handler(ctx, { direction: "incoming", paginationOpts: { numItems, cursor: null } }), /INVALID_PAGE_SIZE/);
  ctx.auth.getUserIdentity = async () => null;
  await assert.rejects(history._handler(ctx, { direction: "incoming", paginationOpts: { numItems: 20, cursor: null } }), /UNAUTHENTICATED/);
});
