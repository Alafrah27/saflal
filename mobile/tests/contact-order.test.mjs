import test from "node:test";
import assert from "node:assert/strict";
import { listOrderedSegment } from "../convex/contacts.js";
import { backfill, verify } from "../convex/migrations/contactOrder.js";
import { directoryOrderKey, contactSegments, contactTraversal, orderedContactStreams } from "../shared/contactOrder.js";
import { historyFixture } from "./fixtures/historyFixture.mjs";

const seed = "12345678-1234-4321-8123-123456789abc";
const options = { numItems: 3, cursor: null };
const run = (f, source = "others", wrap = false, paginationOpts = options, launchSeed = seed) =>
  listOrderedSegment._handler(f.ctx, { seed: launchSeed, source, wrap, paginationOpts });

async function fixture() {
  const f = historyFixture();
  for (let i = 0; i < 37; i++) await f.ctx.db.insert("users", { clerkId: `extra_${i}`, fullName: `User ${i}`, isActive: true });
  for (const [user1Id, user2Id] of [["a", "b"], ["c", "a"], ["a", f.rows.users[4]._id]])
    await f.ctx.db.insert("friendships", { user1Id, user2Id, createdAt: 1 });
  for (const table of ["users", "friendships"]) {
    let cursor = null, result;
    do { result = await backfill._handler(f.ctx, { table, cursor }); cursor = result.continueCursor; } while (!result.isDone);
  }
  return f;
}

async function all(f, launchSeed = seed) {
  const found = [];
  for (const { source, wrap } of contactSegments(launchSeed, "a")) {
    let cursor = null, result;
    do {
      result = await run(f, source, wrap, { ...options, cursor }, launchSeed);
      found.push(...result.page); cursor = result.continueCursor;
      assert.equal(result.splitCursor, "split"); assert.equal(result.pageStatus, "SplitRecommended");
    } while (!result.isDone);
  }
  return found;
}

test("FNV keys are unsigned, stable and use the standard FNV-1a sequence", () => {
  assert.equal(directoryOrderKey("hello"), 0x4f9f2cab);
  assert.equal(directoryOrderKey(""), 2166136261);
  assert.deepEqual(contactSegments(seed, "a").slice(-2), [{ source: "others", wrap: false }, { source: "others", wrap: true }]);
});

test("indexed traversal returns friends first across both orientations, covers the directory once and changes launches", async () => {
  const f = await fixture(), found = await all(f), ids = found.map(row => row._id);
  const friends = ["b", "c", f.rows.users[4]._id];
  assert.deepEqual(new Set(ids.slice(0, 3)), new Set(friends));
  assert.equal(ids.length, f.rows.users.length - 1); assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual((await all(f)).map(row => row._id), ids);
  const changed = (await all(f, "12345678-1234-4321-8123-123456789abd")).map(row => row._id);
  assert.notDeepEqual(changed.slice(3, 8), ids.slice(3, 8));
  assert.ok(f.reads.every(read => read.limit <= 100));
  assert.ok(found.every(row => Object.keys(row).every(key => ["_id", "fullName", "nickName", "imageUrl"].includes(key))));
});

test("ordered segments exclude self, inactive, blocked and missing users and retain sparse pagination", async () => {
  const f = await fixture();
  f.rows.users[1].isActive = false;
  await f.ctx.db.insert("blockedUsers", { blockerId: "c", blockedId: "a", createdAt: 1 });
  const other = f.rows.users[5]._id;
  await f.ctx.db.insert("blockedUsers", { blockerId: "a", blockedId: other, createdAt: 1 });
  const ids = (await all(f)).map(row => row._id);
  for (const id of ["a", "b", "c", other]) assert.ok(!ids.includes(id));
  const writes = f.writes.length;
  await all(f); assert.equal(f.writes.length, writes);
});

test("new friendship moves an existing discovery user into the leading group without changing seed", async () => {
  const f = await fixture(), peerId = f.rows.users[7]._id;
  const before = (await all(f)).map(row => row._id);
  assert.ok(before.indexOf(peerId) >= 3);
  const edge = await f.ctx.db.insert("friendships", { user1Id: peerId, user2Id: "a", createdAt: 1 });
  await f.ctx.db.patch("friendships", edge, { directoryOrderKey: directoryOrderKey(edge) });
  const after = (await all(f)).map(row => row._id);
  assert.ok(after.indexOf(peerId) < 4); assert.equal(after.filter(id => id === peerId).length, 1);
  assert.equal(after.length, before.length);
});

test("ordered endpoints authenticate and validate before indexed pagination", async () => {
  const f = await fixture();
  for (const actor of [null, "missing"]) { f.as(actor); await assert.rejects(run(f)); }
  f.as("a");
  for (const invalid of ["", "a".repeat(10000)]) await assert.rejects(run(f, "others", false, options, invalid), /INVALID_CONTACT_ORDER/);
  for (const numItems of [0, 101, 1.5]) await assert.rejects(run(f, "others", false, { ...options, numItems }), /PAGE_SIZE/);
  await assert.rejects(run(f, "others", false, { ...options, maximumRowsRead: 0 }), /PAGINATION_LIMIT/);
});

test("backfill is bounded, idempotent and preserves all fields besides the added key", async () => {
  const f = historyFixture();
  for (let i = 0; i < 112; i++) await f.ctx.db.insert("users", { fullName: `Preserve ${i}`, isActive: true });
  const original = structuredClone(f.rows.users);
  let cursor = null, result, scanned = 0;
  do { result = await backfill._handler(f.ctx, { table: "users", cursor }); cursor = result.continueCursor; scanned += result.scanned; } while (!result.isDone);
  assert.equal(scanned, original.length);
  for (let i = 0; i < original.length; i++) {
    const { directoryOrderKey: key, ...rest } = f.rows.users[i];
    assert.deepEqual(rest, original[i]); assert.equal(key, directoryOrderKey(rest._id));
  }
  const writes = f.writes.length;
  cursor = null;
  do { result = await backfill._handler(f.ctx, { table: "users", cursor }); cursor = result.continueCursor; assert.equal(result.changed, 0); } while (!result.isDone);
  assert.equal(f.writes.length, writes);
  cursor = null;
  do { result = await verify._handler(f.ctx, { table: "users", cursor }); cursor = result.continueCursor; assert.equal(result.missing, 0); } while (!result.isDone);
});

test("stream composition waits for earlier segments, deduplicates and moves new friendships ahead of discovery", () => {
  const stream = (results = [], status = "Exhausted") => ({ results, status });
  const streams = [stream([{ _id: "friend" }]), stream(), stream(), stream(), stream([{ _id: "other" }]), stream()];
  assert.deepEqual(orderedContactStreams(streams).results.map(row => row._id), ["friend", "other"]);
  streams[0] = stream([{ _id: "friend" }, { _id: "other" }], "CanLoadMore");
  assert.deepEqual(orderedContactStreams(streams).results.map(row => row._id), ["friend", "other"]);
  assert.equal(orderedContactStreams(streams).current, 0);
  streams[0].status = "Exhausted";
  assert.equal(orderedContactStreams(streams).results.length, 2);
  streams[1].status = "LoadingFirstPage";
  assert.equal(orderedContactStreams(streams).status, "LoadingMore");
  assert.deepEqual(orderedContactStreams(streams).results.map(row => row._id), ["friend", "other"]);
});
