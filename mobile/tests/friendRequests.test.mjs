import test from "node:test";
import { directoryOrderKey } from "../shared/contactOrder.js";
import assert from "node:assert/strict";
import {
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  getPendingFriendRequests, getFriendshipStatus,
} from "../convex/friendRequests.js";
import { blockUser } from "../convex/blockedUsers.js";
import schema from "../convex/schema.js";

const tables = JSON.parse(schema.export()).tables;
const pageOpts = { numItems: 20, cursor: null };

// Uses the actual schema/index declarations. Short test IDs and direct handler
// calls do not emulate runtime validators or Convex's transaction scheduler.
function fixture(subject = "clerk_a") {
  let sequence = 0;
  const rows = Object.fromEntries(tables.map(table => [table.tableName, []]));
  rows.users = ["a", "b", "c", "d"].map(id => ({
    _id: id, _creationTime: 1, clerkId: `clerk_${id}`, userId: `handle_${id}`,
    fullName: `User ${id}`, imageUrl: `https://example.com/${id}.png`,
    bio: "Private bio", isOnline: true, lastSeenAt: 5,
    showOnlineStatus: true, showLastSeen: true, isActive: true,
    createdAt: 1, updatedAt: 1,
  }));
  const reads = [], writes = [], paginationCalls = [];
  const as = id => { subject = id === null ? null : `clerk_${id}`; };
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    db: {
      query(table) {
        assert.ok(["users", "blockedUsers", "friendRequests", "friendships", "devices", "calls"].includes(table));
        const equalities = [];
        let direction = "asc";
        const matches = () => rows[table]
          .filter(row => equalities.every(([field, value]) => row[field] === value))
          .sort((a, b) => direction === "desc"
            ? b._creationTime - a._creationTime : a._creationTime - b._creationTime);
        return {
          withIndex(name, build) {
            const index = tables.find(item => item.tableName === table).indexes
              .find(item => item.indexDescriptor === name);
            assert.ok(index, `Index ${table}.${name} must exist in the schema`);
            const builder = {
              eq(field, value) {
                assert.equal(field, index.fields[equalities.length]);
                equalities.push([field, value]);
                return builder;
              },
            };
            build(builder);
            reads.push({ table, index: name, equalities });
            return this;
          },
          order(value) { direction = value; return this; },
          async first() { return matches()[0] ?? null; },
          async take(limit) {
            assert.ok(["devices", "calls"].includes(table));
            assert.equal(limit, table === "calls" ? 2 : 20);
            return matches().slice(0, limit);
          },
          async unique() {
            assert.notEqual(table, "friendRequests", "Request history must use bounded latest lookups");
            const found = matches();
            assert.ok(found.length <= 1);
            return found[0] ?? null;
          },
          async paginate(options) {
            paginationCalls.push(options);
            const all = matches(), start = Number(options.cursor ?? 0);
            const page = all.slice(start, start + Math.min(options.numItems, options.maximumRowsRead));
            return {
              page, continueCursor: String(start + page.length),
              isDone: start + page.length >= all.length,
              splitCursor: "native-split", pageStatus: "SplitRecommended",
            };
          },
        };
      },
      async get(table, id) {
        assert.ok(["users", "friendRequests"].includes(table));
        return rows[table].find(row => row._id === id) ?? null;
      },
      async insert(table, fields) {
        assert.ok(["friendRequests", "friendships", "blockedUsers"].includes(table));
        const _id = `${table}_${++sequence}`;
        rows[table].push({ _id, _creationTime: sequence, ...fields });
        writes.push({ type: "insert", table, id: _id });
        return _id;
      },
      async patch(table, id, fields) {
        assert.ok(["friendRequests", "friendships"].includes(table));
        const row = rows[table].find(row => row._id === id);
        assert.ok(row);
        Object.assign(row, fields);
        writes.push({ type: "patch", table, id });
      },
    },
  };
  const seedRequest = (senderId, receiverId, status = "pending") => ctx.db.insert("friendRequests", {
    senderId, receiverId, status, createdAt: 10, updatedAt: 10,
  });
  return { ctx, rows, as, reads, writes, paginationCalls, seedRequest };
}
const send = (ctx, receiverId = "b") => sendFriendRequest._handler(ctx, { receiverId });
const accept = (ctx, requestId) => acceptFriendRequest._handler(ctx, { requestId });
const reject = (ctx, requestId) => rejectFriendRequest._handler(ctx, { requestId });
const status = (ctx, userId = "b") => getFriendshipStatus._handler(ctx, { userId });
const pending = (ctx, paginationOpts = pageOpts) => getPendingFriendRequests._handler(ctx, { paginationOpts });

test("all five functions reject anonymous, missing-profile, and inactive callers", async () => {
  for (const [subject, code] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const { ctx, rows, writes } = fixture(subject);
    if (subject === "clerk_a") rows.users[0].isActive = false;
    for (const run of [() => send(ctx), () => accept(ctx, "unknown"), () => reject(ctx, "unknown"), () => pending(ctx), () => status(ctx)]) {
      await assert.rejects(run, code);
    }
    assert.deepEqual(writes, []);
  }
});

test("send stores only authenticated ownership and server timestamps without creating a friendship", async () => {
  const { ctx, rows } = fixture();
  const before = Date.now();
  const result = await send(ctx);
  const request = rows.friendRequests[0];
  assert.deepEqual(result, { requestId: request._id, status: "pending" });
  assert.equal(request.senderId, "a");
  assert.equal(request.receiverId, "b");
  assert.equal(request.status, "pending");
  assert.equal(request.createdAt, request.updatedAt);
  assert.ok(request.createdAt >= before && request.createdAt <= Date.now());
  assert.deepEqual(rows.friendships, []);
});

test("send rejects self, missing, and inactive recipients without writing", async () => {
  const { ctx, rows, writes } = fixture();
  await assert.rejects(send(ctx, "a"), /CANNOT_REQUEST_SELF/);
  await assert.rejects(send(ctx, "missing"), /USER_UNAVAILABLE/);
  rows.users[1].isActive = false;
  await assert.rejects(send(ctx), /USER_UNAVAILABLE/);
  assert.deepEqual(writes, []);
});

test("blocks in either direction prevent sending with the same generic error", async () => {
  for (const blocker of ["a", "b"]) {
    const { ctx, as, rows } = fixture();
    as(blocker);
    await blockUser._handler(ctx, { blockedId: blocker === "a" ? "b" : "a" });
    as("a");
    await assert.rejects(send(ctx), /USER_UNAVAILABLE/);
    assert.deepEqual(rows.friendRequests, []);
  }
});

test("sending repeatedly returns the pending request without changing history or timestamps", async () => {
  const { ctx, rows, writes } = fixture();
  const originalResult = await send(ctx);
  const original = structuredClone(rows.friendRequests);
  assert.deepEqual(await send(ctx), originalResult);
  assert.deepEqual(rows.friendRequests, original);
  assert.equal(writes.length, 1);
});

test("crossed requests require explicit acceptance and preserve the original pending request", async () => {
  const { ctx, as, rows } = fixture();
  const first = await send(ctx);
  as("b");
  await assert.rejects(send(ctx, "a"), /INCOMING_REQUEST_PENDING/);
  assert.deepEqual(await status(ctx, "a"), { status: "incoming_pending", requestId: first.requestId });
  assert.equal(rows.friendRequests.length, 1);
  assert.equal(rows.friendRequests[0].status, "pending");
  assert.equal(rows.friendships.length, 0);
});

test("rejection permits a fresh request and old request decisions cannot affect the new one", async () => {
  const { ctx, as, rows } = fixture();
  const first = await send(ctx);
  as("b");
  await reject(ctx, first.requestId);
  const old = structuredClone(rows.friendRequests[0]);
  as("a");
  assert.deepEqual(await status(ctx), { status: "none" });
  const second = await send(ctx);
  assert.notEqual(second.requestId, first.requestId);
  assert.deepEqual(rows.friendRequests[0], old);
  as("b");
  await reject(ctx, first.requestId);
  await assert.rejects(accept(ctx, first.requestId), /REQUEST_NOT_PENDING/);
  assert.equal(rows.friendRequests[1].status, "pending");
  assert.equal(rows.friendships.length, 0);
});

test("rejected/cancelled history in both directions uses the latest indexed record", async () => {
  const { ctx, rows, seedRequest } = fixture();
  await seedRequest("a", "b", "rejected");
  await seedRequest("a", "b", "cancelled");
  await seedRequest("b", "a", "rejected");
  const history = structuredClone(rows.friendRequests);
  const result = await send(ctx);
  assert.equal(rows.friendRequests.length, 4);
  assert.deepEqual(rows.friendRequests.slice(0, 3), history);
  assert.deepEqual(await send(ctx), result);
  assert.deepEqual(await status(ctx), { status: "outgoing_pending", requestId: result.requestId });
});

test("only the receiver can accept or reject; foreign and nonexistent request IDs share one error", async () => {
  const { ctx, as, rows } = fixture();
  const { requestId } = await send(ctx);
  for (const caller of ["a", "c"]) {
    as(caller);
    for (const operation of [accept, reject]) {
      await assert.rejects(operation(ctx, requestId), /REQUEST_UNAVAILABLE/);
      await assert.rejects(operation(ctx, "unknown"), /REQUEST_UNAVAILABLE/);
    }
  }
  assert.equal(rows.friendRequests[0].status, "pending");
  assert.deepEqual(rows.friendships, []);
});

test("accept creates a sorted friendship and a repeated decision makes no additional writes", async () => {
  const { ctx, as, rows, writes } = fixture("clerk_b");
  const { requestId } = await send(ctx, "a");
  as("a");
  const result = await accept(ctx, requestId);
  assert.deepEqual(result, { requestId, status: "accepted" });
  assert.equal(rows.friendRequests[0].status, "accepted");
  assert.equal(rows.friendRequests[0].createdAt <= rows.friendRequests[0].updatedAt, true);
  assert.deepEqual(rows.friendships.map(({ user1Id, user2Id }) => [user1Id, user2Id]), [["a", "b"]]);
  assert.equal(rows.friendships[0].createdAt, rows.friendRequests[0].updatedAt);
  assert.equal(rows.friendships[0].directoryOrderKey, directoryOrderKey(rows.friendships[0]._id));
  const original = structuredClone(rows);
  const count = writes.length;
  assert.deepEqual(await accept(ctx, requestId), result);
  assert.deepEqual(rows, original);
  assert.equal(writes.length, count);
  await assert.rejects(reject(ctx, requestId), /REQUEST_NOT_PENDING/);
});

test("existing friendships in either orientation prevent sends and are reused on acceptance", async () => {
  for (const [user1Id, user2Id] of [["a", "b"], ["b", "a"]]) {
    const { ctx, as, rows, seedRequest } = fixture();
    const requestId = await seedRequest("a", "b");
    await ctx.db.insert("friendships", { user1Id, user2Id, createdAt: 1 });
    const original = structuredClone(rows.friendships);
    await assert.rejects(send(ctx), /ALREADY_FRIENDS/);
    as("b");
    await accept(ctx, requestId);
    assert.deepEqual(rows.friendships, original);
    assert.deepEqual(await status(ctx, "a"), { status: "friends" });
  }
});

test("blocking in either direction after send prevents acceptance without changing the request", async () => {
  for (const blocker of ["a", "b"]) {
    const { ctx, as, rows } = fixture();
    const { requestId } = await send(ctx);
    as(blocker);
    await blockUser._handler(ctx, { blockedId: blocker === "a" ? "b" : "a" });
    as("b");
    const original = structuredClone(rows.friendRequests);
    await assert.rejects(accept(ctx, requestId), /REQUEST_UNAVAILABLE/);
    assert.deepEqual(rows.friendRequests, original);
    assert.equal(rows.friendships.length, 0);
  }
});

test("missing/inactive senders prevent acceptance but still allow rejection", async () => {
  for (const mode of ["deleted", "inactive"]) {
    const { ctx, as, rows } = fixture();
    const { requestId } = await send(ctx);
    if (mode === "deleted") rows.users = rows.users.filter(user => user._id !== "a");
    else rows.users[0].isActive = false;
    as("b");
    await assert.rejects(accept(ctx, requestId), /REQUEST_UNAVAILABLE/);
    assert.deepEqual(await reject(ctx, requestId), { requestId, status: "rejected" });
    assert.equal(rows.friendships.length, 0);
  }
});

test("reject succeeds after blocking, is idempotent, and never removes an existing friendship", async () => {
  const { ctx, as, rows, writes } = fixture();
  const { requestId } = await send(ctx);
  await ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  as("b");
  await blockUser._handler(ctx, { blockedId: "a" });
  const friends = structuredClone(rows.friendships);
  const result = await reject(ctx, requestId);
  const original = structuredClone(rows.friendRequests);
  const count = writes.length;
  assert.deepEqual(await reject(ctx, requestId), result);
  assert.deepEqual(rows.friendRequests, original);
  assert.deepEqual(rows.friendships, friends);
  assert.equal(writes.length, count);
  await assert.rejects(accept(ctx, requestId), /REQUEST_NOT_PENDING/);
});

test("cancelled requests cannot be accepted or rejected", async () => {
  const { ctx, as, seedRequest, rows } = fixture();
  const requestId = await seedRequest("a", "b", "cancelled");
  as("b");
  await assert.rejects(accept(ctx, requestId), /REQUEST_NOT_PENDING/);
  await assert.rejects(reject(ctx, requestId), /REQUEST_NOT_PENDING/);
  assert.equal(rows.friendRequests[0].status, "cancelled");
});

test("friendship insertion failure propagates and does not prematurely accept the request", async () => {
  const { ctx, as, rows } = fixture();
  const { requestId } = await send(ctx);
  as("b");
  ctx.db.insert = async () => { throw new Error("Storage unavailable"); };
  await assert.rejects(accept(ctx, requestId), /Storage unavailable/);
  assert.equal(rows.friendRequests[0].status, "pending");
  assert.deepEqual(rows.friendships, []);
});

test("list includes only the caller's incoming pending requests with minimal sender profiles", async () => {
  const { ctx, seedRequest } = fixture();
  await seedRequest("b", "a");
  await seedRequest("c", "a");
  await seedRequest("d", "a", "rejected");
  await seedRequest("d", "a", "accepted");
  await seedRequest("a", "b");
  const result = await pending(ctx);
  assert.deepEqual(result.page.map(row => row.senderId), ["c", "b"]);
  for (const row of result.page) {
    assert.deepEqual(Object.keys(row).sort(), ["_id", "createdAt", "receiverId", "sender", "senderId", "status", "updatedAt"]);
    assert.equal(row.receiverId, "a");
    assert.equal(row.status, "pending");
    assert.deepEqual(row.sender, { fullName: `User ${row.senderId}`, imageUrl: `https://example.com/${row.senderId}.png` });
  }
});

test("list handles deleted senders and optional image URLs without hiding pending records", async () => {
  const { ctx, seedRequest, rows } = fixture();
  await seedRequest("b", "a");
  await seedRequest("c", "a");
  rows.users = rows.users.filter(user => user._id !== "b");
  delete rows.users.find(user => user._id === "c").imageUrl;
  assert.deepEqual((await pending(ctx)).page.map(row => row.sender), [{ fullName: "User c" }, null]);
});

test("list paginates newest first, preserves native metadata, and supports empty/boundary pages", async () => {
  const { ctx, seedRequest } = fixture();
  assert.deepEqual((await pending(ctx)).page, []);
  assert.equal((await pending(ctx)).isDone, true);
  await seedRequest("b", "a");
  await seedRequest("c", "a");
  const first = await pending(ctx, { numItems: 1, cursor: null });
  assert.equal(first.isDone, false);
  assert.equal(first.pageStatus, "SplitRecommended");
  assert.equal(first.splitCursor, "native-split");
  const next = await pending(ctx, { numItems: 1, cursor: first.continueCursor });
  assert.deepEqual([...first.page, ...next.page].map(row => row.senderId), ["c", "b"]);
  assert.equal(next.isDone, true);
  assert.equal((await pending(ctx, { numItems: 100, cursor: null })).page.length, 2);
});

test("pagination rejects invalid limits, caps reads, and preserves native client options", async () => {
  const { ctx, paginationCalls } = fixture();
  for (const numItems of [0, -1, 101, 1.5, NaN, Infinity]) {
    await assert.rejects(pending(ctx, { numItems, cursor: null }), /PAGE_SIZE_MUST_BE_1_TO_100/);
  }
  for (const key of ["maximumRowsRead", "maximumBytesRead"]) {
    for (const limit of [0, -1, 1.5, NaN, Infinity]) {
      await assert.rejects(pending(ctx, { ...pageOpts, [key]: limit }), /INVALID_PAGINATION_LIMIT/);
    }
  }
  assert.equal(paginationCalls.length, 0);
  const options = { ...pageOpts, id: 5, endCursor: "end", maximumRowsRead: 5000, maximumBytesRead: 4096 };
  await pending(ctx, options);
  assert.deepEqual(paginationCalls.at(-1), { ...options, maximumRowsRead: 100 });
  assert.equal(options.maximumRowsRead, 5000);
  await pending(ctx, { ...pageOpts, maximumRowsRead: 5 });
  assert.equal(paginationCalls.at(-1).maximumRowsRead, 5);
});

test("status is caller-related and does not reveal reverse blocks or unrelated pending requests", async () => {
  const { ctx, as, seedRequest, reads } = fixture();
  await seedRequest("b", "c");
  assert.deepEqual(await status(ctx), { status: "none" });
  as("b");
  await blockUser._handler(ctx, { blockedId: "a" });
  as("a");
  reads.length = 0;
  assert.deepEqual(await status(ctx), { status: "none" });
  assert.equal(reads.some(read => read.table === "blockedUsers"), false);
  assert.ok(reads.every(read => read.table === "users" || read.equalities.some(([, id]) => id === "a")));
  const requestId = await seedRequest("b", "a");
  assert.deepEqual(await status(ctx), { status: "incoming_pending", requestId });
  assert.deepEqual(await status(ctx, "a"), { status: "none" });
});

test("public validators constrain identity and declare all response shapes", () => {
  for (const [operation, field, tableName] of [
    [sendFriendRequest, "receiverId", "users"],
    [acceptFriendRequest, "requestId", "friendRequests"],
    [rejectFriendRequest, "requestId", "friendRequests"],
    [getFriendshipStatus, "userId", "users"],
  ]) {
    const args = JSON.parse(operation.exportArgs());
    assert.deepEqual(Object.keys(args.value), [field]);
    assert.deepEqual(args.value[field].fieldType, { type: "id", tableName });
  }
  assert.deepEqual(Object.keys(JSON.parse(getPendingFriendRequests.exportArgs()).value), ["paginationOpts"]);
  for (const operation of [sendFriendRequest, acceptFriendRequest, rejectFriendRequest]) {
    assert.deepEqual(Object.keys(JSON.parse(operation.exportReturns()).value).sort(), ["requestId", "status"]);
  }
  const listing = JSON.parse(getPendingFriendRequests.exportReturns());
  assert.equal(listing.value.page.fieldType.type, "array");
  const relationship = JSON.parse(getFriendshipStatus.exportReturns());
  assert.equal(relationship.type, "union");
});

test("friend requests preserve user profiles, blocking, chats, messages, calls, and devices", async () => {
  const { ctx, as, rows, writes } = fixture();
  rows.chats.push({ _id: "chat", createdAt: 1 });
  rows.messages.push({ _id: "message", text: "Existing history" });
  rows.calls.push({ _id: "call", status: "ended" });
  rows.devices.push({ _id: "device", isActive: true });
  const original = structuredClone(rows);
  delete original.friendRequests; delete original.friendships;
  const first = await send(ctx);
  as("b");
  await reject(ctx, first.requestId);
  as("a");
  const second = await send(ctx);
  as("b");
  await accept(ctx, second.requestId);
  await pending(ctx); await status(ctx, "a");
  const after = structuredClone(rows);
  delete after.friendRequests; delete after.friendships;
  assert.deepEqual(after, original);
  assert.ok(writes.every(write => ["friendRequests", "friendships"].includes(write.table)));
});
