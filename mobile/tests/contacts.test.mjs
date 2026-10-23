import test from "node:test";
import assert from "node:assert/strict";
import { listUsers } from "../convex/contacts.js";
import schema from "../convex/schema.js";

const tables = JSON.parse(schema.export()).tables;
const opts = { numItems: 20, cursor: null };

function fixture(subject = "clerk_a") {
  const rows = {
    users: ["a", "b", "c", "d"].map((id, index) => ({
      _id: id, _creationTime: index, clerkId: `clerk_${id}`,
      fullName: `User ${id}`, imageUrl: `https://example.com/${id}.png`,
      bio: "Private bio", isOnline: true, lastSeenAt: 10,
      showOnlineStatus: true, showLastSeen: true, isActive: true,
      createdAt: index, updatedAt: index,
    })),
    blockedUsers: [], friendships: [],
  };
  const paginationCalls = [], reads = [];
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    db: {
      query(table) {
        assert.ok(["users", "blockedUsers", "friendships"].includes(table));
        const equalities = [];
        let direction = "asc";
        const matches = () => rows[table].filter(row => equalities.every(([key, value]) => row[key] === value));
        return {
          withIndex(name, build) {
            const index = tables.find(item => item.tableName === table).indexes.find(item => item.indexDescriptor === name);
            assert.ok(index);
            const builder = { eq(key, value) {
              assert.equal(key, index.fields[equalities.length]);
              equalities.push([key, value]); return builder;
            } };
            build(builder); reads.push({ table, index: name, equalities }); return this;
          },
          order(value) { direction = value; return this; },
          async unique() {
            const found = matches(); assert.ok(found.length <= 1); return found[0] ?? null;
          },
          async first() { return matches()[0] ?? null; },
          async paginate(options) {
            assert.equal(table, "users");
            paginationCalls.push(options);
            const all = matches().sort((a, b) => direction === "desc" ? b._creationTime - a._creationTime : a._creationTime - b._creationTime);
            const start = Number(options.cursor ?? 0);
            const page = all.slice(start, start + Math.min(options.numItems, options.maximumRowsRead));
            return { page, continueCursor: String(start + page.length), isDone: start + page.length >= all.length,
              splitCursor: "native-split", pageStatus: "SplitRecommended" };
          },
        };
      },
    },
  };
  return { ctx, rows, paginationCalls, reads };
}
const list = (ctx, paginationOpts = opts) => listUsers._handler(ctx, { paginationOpts });

test("user discovery rejects anonymous, missing-profile, and inactive callers before pagination", async () => {
  for (const [subject, code] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const { ctx, rows, paginationCalls } = fixture(subject);
    if (subject === "clerk_a") rows.users[0].isActive = false;
    await assert.rejects(list(ctx), code);
    assert.equal(paginationCalls.length, 0);
  }
});

test("discovery returns all other active users, newest first, with minimal profiles", async () => {
  const { ctx, rows } = fixture();
  rows.users[2].isActive = false;
  const before = structuredClone(rows);
  const result = await list(ctx);
  assert.deepEqual(result.page.map(user => user._id), ["d", "b"]);
  for (const user of result.page) {
    assert.deepEqual(user, { _id: user._id, fullName: `User ${user._id}`, imageUrl: `https://example.com/${user._id}.png` });
  }
  assert.deepEqual(rows, before);
});

test("both block directions hide users; unrelated blocks do not hide them", async () => {
  const { ctx, rows } = fixture();
  rows.blockedUsers.push(
    { blockerId: "a", blockedId: "b" }, { blockerId: "c", blockedId: "a" },
    { blockerId: "b", blockedId: "d" },
  );
  assert.deepEqual((await list(ctx)).page.map(user => user._id), ["d"]);
});

test("a fully filtered page preserves its cursor so later visible users remain reachable", async () => {
  const { ctx, rows, paginationCalls } = fixture();
  rows.users[3].isActive = false;
  const first = await list(ctx, { numItems: 1, cursor: null });
  assert.deepEqual(first.page, []);
  assert.equal(first.isDone, false);
  assert.equal(first.continueCursor, "1");
  assert.equal(first.pageStatus, "SplitRecommended");
  assert.equal(first.splitCursor, "native-split");
  const next = await list(ctx, { numItems: 1, cursor: first.continueCursor });
  assert.deepEqual(next.page.map(user => user._id), ["c"]);
  assert.equal(paginationCalls.length, 2);
});

test("pagination reaches the end without duplicates or exposing the current user", async () => {
  const { ctx } = fixture();
  let cursor = null, isDone = false;
  const ids = [];
  for (let attempt = 0; attempt < 4 && !isDone; attempt++) {
    const result = await list(ctx, { numItems: 1, cursor });
    ids.push(...result.page.map(user => user._id));
    cursor = result.continueCursor; isDone = result.isDone;
  }
  assert.deepEqual(ids, ["d", "c", "b"]);
  assert.equal(isDone, true);
});

test("optional photos and an exhausted self-only page are valid", async () => {
  const { ctx, rows } = fixture();
  delete rows.users[1].imageUrl;
  assert.deepEqual((await list(ctx)).page.at(-1), { _id: "b", fullName: "User b" });
  rows.users = rows.users.slice(0, 1);
  const result = await list(ctx);
  assert.deepEqual(result.page, []);
  assert.equal(result.isDone, true);
});

test("pagination validates sizes/read limits and keeps native options under a server cap", async () => {
  const { ctx, paginationCalls } = fixture();
  for (const numItems of [0, -1, 101, 1.5, NaN, Infinity]) {
    await assert.rejects(list(ctx, { numItems, cursor: null }), /PAGE_SIZE_MUST_BE_1_TO_100/);
  }
  for (const key of ["maximumRowsRead", "maximumBytesRead"]) {
    for (const value of [0, -1, 1.5, NaN, Infinity]) {
      await assert.rejects(list(ctx, { ...opts, [key]: value }), /INVALID_PAGINATION_LIMIT/);
    }
  }
  assert.equal(paginationCalls.length, 0);
  const options = { numItems: 100, cursor: null, endCursor: "end", id: 9, maximumRowsRead: 900, maximumBytesRead: 4096 };
  await list(ctx, options);
  assert.deepEqual(paginationCalls.at(-1), { ...options, maximumRowsRead: 100 });
  assert.equal(options.maximumRowsRead, 900);
  await list(ctx, { ...opts, maximumRowsRead: 2 });
  assert.equal(paginationCalls.at(-1).maximumRowsRead, 2);
});

test("fresh reads reflect profile/block changes without mutating existing records", async () => {
  const { ctx, rows } = fixture();
  await list(ctx);
  rows.users[1].fullName = "Updated name";
  rows.blockedUsers.push({ blockerId: "d", blockedId: "a" });
  const result = await list(ctx);
  assert.deepEqual(result.page.map(user => user._id), ["c", "b"]);
  assert.equal(result.page.at(-1).fullName, "Updated name");
});

test("public validators accept no client identity and disclose only discovery fields", () => {
  assert.deepEqual(Object.keys(JSON.parse(listUsers.exportArgs()).value), ["paginationOpts", "friendsOnly"]);
  const item = JSON.parse(listUsers.exportReturns()).value.page.fieldType.value;
  assert.deepEqual(Object.keys(item.value).sort(), ["_id", "fullName", "imageUrl", "nickName"]);
});

test("call picker lists only friends in either orientation and retains block/inactive filtering", async () => {
  const { ctx, rows } = fixture();
  rows.friendships.push({ user1Id: "a", user2Id: "b" }, { user1Id: "d", user2Id: "a" });
  assert.deepEqual((await listUsers._handler(ctx, { paginationOpts: opts, friendsOnly: true })).page.map(user => user._id), ["d", "b"]);
  rows.blockedUsers.push({ blockerId: "d", blockedId: "a" });
  rows.users[1].isActive = false;
  assert.deepEqual((await listUsers._handler(ctx, { paginationOpts: opts, friendsOnly: true })).page, []);
  assert.deepEqual((await list(ctx)).page.map(user => user._id), ["c"]);
});

test("friends-only sparse pages keep native cursors and later friends remain reachable", async () => {
  const { ctx, rows, paginationCalls } = fixture();
  rows.friendships.push({ user1Id: "a", user2Id: "b" });
  const read = cursor => listUsers._handler(ctx, { paginationOpts: { numItems: 1, cursor }, friendsOnly: true });
  const first = await read(null), second = await read(first.continueCursor), third = await read(second.continueCursor);
  assert.deepEqual(first.page, []); assert.equal(first.isDone, false);
  assert.deepEqual(second.page, []); assert.deepEqual(third.page.map(user => user._id), ["b"]);
  assert.equal(paginationCalls.length, 3);
  assert.equal(first.splitCursor, "native-split");
});
