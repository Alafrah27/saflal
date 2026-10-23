import test from "node:test";
import assert from "node:assert/strict";
import { blockUser, unblockUser, getBlockedUsers, getBlockingStatus } from "../convex/blockedUsers.js";
import { hasBlockingRelationship } from "../convex/lib/blocking.js";
import schema from "../convex/schema.js";

const tables = JSON.parse(schema.export()).tables;
const pageOpts = { numItems: 20, cursor: null };

// Handler tests use existing schema-shaped profiles. This fixture checks index
// selection and ownership, but does not simulate Convex transactions/validators.
function fixture(subject = "clerk_a") {
  let sequence = 0;
  const user = id => ({
    _id: id, _creationTime: 1, clerkId: `clerk_${id}`, userId: `handle_${id}`,
    fullName: `User ${id}`, imageUrl: `https://example.com/${id}.png`,
    bio: "Private profile text", isOnline: true, lastSeenAt: 10,
    showOnlineStatus: true, showLastSeen: true, isActive: true,
    createdAt: 1, updatedAt: 1,
  });
  const rows = {
    users: [user("a"), user("b"), user("c")], blockedUsers: [],
    messages: [{ _id: "message", text: "Keep history" }],
    friendships: [{ _id: "friendship", user1Id: "a", user2Id: "b" }],
    friendRequests: [{ _id: "request", status: "pending" }],
    calls: [{ _id: "call", status: "ended" }],
  };
  const reads = [];
  const writes = [];
  const paginationCalls = [];
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    db: {
      query(table) {
        assert.ok(["users", "blockedUsers", "calls"].includes(table));
        const equalities = [];
        let direction = "asc";
        const matches = () => rows[table].filter(row => equalities.every(([key, value]) => row[key] === value));
        return {
          withIndex(name, build) {
            const index = tables.find(item => item.tableName === table).indexes
              .find(item => item.indexDescriptor === name);
            assert.ok(index, `Index ${table}.${name} must exist in the schema`);
            const builder = {
              eq(key, value) {
                assert.equal(key, index.fields[equalities.length]);
                equalities.push([key, value]);
                return builder;
              },
            };
            build(builder);
            reads.push({ table, index: name, equalities });
            return this;
          },
          order(value) { direction = value; return this; },
          async take(limit) {
            assert.equal(table, "calls");
            assert.equal(limit, 2);
            return matches().slice(0, limit);
          },
          async unique() {
            const found = matches();
            assert.ok(found.length <= 1, "Duplicate pair detected");
            return found[0] ?? null;
          },
          async paginate(options) {
            paginationCalls.push(options);
            const all = matches().sort((a, b) => direction === "desc"
              ? b._creationTime - a._creationTime : a._creationTime - b._creationTime);
            const start = Number(options.cursor ?? 0);
            const count = Math.min(options.numItems, options.maximumRowsRead);
            const page = all.slice(start, start + count);
            return {
              page, continueCursor: String(start + page.length),
              isDone: start + page.length >= all.length,
              splitCursor: "native-split", pageStatus: "SplitRecommended",
            };
          },
        };
      },
      async get(table, id) {
        assert.equal(table, "users");
        return rows.users.find(row => row._id === id) ?? null;
      },
      async insert(table, fields) {
        assert.equal(table, "blockedUsers");
        const _id = `block_${++sequence}`;
        rows.blockedUsers.push({ _id, _creationTime: sequence, ...fields });
        writes.push({ type: "insert", table });
        return _id;
      },
      async delete(table, id) {
        assert.equal(table, "blockedUsers");
        const index = rows.blockedUsers.findIndex(row => row._id === id);
        assert.ok(index >= 0);
        rows.blockedUsers.splice(index, 1);
        writes.push({ type: "delete", table });
      },
    },
  };
  return { ctx, rows, reads, writes, paginationCalls };
}

test("all public operations reject anonymous, missing-profile, and inactive callers", async () => {
  for (const [kind, expected] of [["anonymous", /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["inactive", /ACCOUNT_INACTIVE/]]) {
    const { ctx, rows, writes } = fixture(kind === "anonymous" ? null : kind === "missing" ? "missing" : "clerk_a");
    if (kind === "inactive") rows.users[0].isActive = false;
    for (const operation of [blockUser, unblockUser, getBlockingStatus]) {
      await assert.rejects(operation._handler(ctx, { blockedId: "b" }), expected);
    }
    await assert.rejects(getBlockedUsers._handler(ctx, { paginationOpts: pageOpts }), expected);
    assert.deepEqual(writes, []);
  }
});

test("blocking derives ownership from identity and is idempotent", async () => {
  const { ctx, rows, writes } = fixture();
  const before = Date.now();
  assert.deepEqual(await blockUser._handler(ctx, { blockedId: "b" }), { isBlockedByMe: true });
  const original = structuredClone(rows.blockedUsers[0]);
  assert.equal(original.blockerId, "a");
  assert.equal(original.blockedId, "b");
  assert.ok(original.createdAt >= before && original.createdAt <= Date.now());
  assert.deepEqual(await blockUser._handler(ctx, { blockedId: "b" }), { isBlockedByMe: true });
  assert.deepEqual(rows.blockedUsers, [original]);
  assert.equal(writes.length, 1);
});

test("self-blocking and nonexistent targets reject without writing", async () => {
  const { ctx, writes } = fixture();
  await assert.rejects(blockUser._handler(ctx, { blockedId: "a" }), /CANNOT_BLOCK_SELF/);
  await assert.rejects(blockUser._handler(ctx, { blockedId: "missing" }), /USER_NOT_FOUND/);
  assert.deepEqual(writes, []);
});

test("unblocking is idempotent and works after the target profile is deleted", async () => {
  const { ctx, rows, writes } = fixture();
  await blockUser._handler(ctx, { blockedId: "b" });
  rows.users = rows.users.filter(row => row._id !== "b");
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.deepEqual(await unblockUser._handler(ctx, { blockedId: "b" }), { isBlockedByMe: false });
  }
  assert.equal(rows.blockedUsers.length, 0);
  assert.equal(writes.filter(write => write.type === "delete").length, 1);
});

test("unblocking cannot remove a reverse block or another user's record", async () => {
  const { ctx, rows } = fixture();
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_b" });
  await blockUser._handler(ctx, { blockedId: "a" });
  await blockUser._handler(ctx, { blockedId: "c" });
  const original = structuredClone(rows.blockedUsers);
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a" });
  await unblockUser._handler(ctx, { blockedId: "b" });
  assert.deepEqual(rows.blockedUsers, original);
});

test("public status reveals only the caller's block and never checks the reverse pair", async () => {
  const { ctx, reads } = fixture("clerk_b");
  await blockUser._handler(ctx, { blockedId: "a" });
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a" });
  reads.length = 0;
  assert.deepEqual(await getBlockingStatus._handler(ctx, { blockedId: "b" }), { isBlockedByMe: false });
  assert.deepEqual(reads.filter(read => read.table === "blockedUsers"), [{
    table: "blockedUsers", index: "by_pair", equalities: [["blockerId", "a"], ["blockedId", "b"]],
  }]);
  await blockUser._handler(ctx, { blockedId: "b" });
  assert.deepEqual(await getBlockingStatus._handler(ctx, { blockedId: "b" }), { isBlockedByMe: true });
});

test("list is caller-only, newest first, and returns minimal profiles", async () => {
  const { ctx } = fixture("clerk_b");
  await blockUser._handler(ctx, { blockedId: "c" });
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a" });
  await blockUser._handler(ctx, { blockedId: "b" });
  await blockUser._handler(ctx, { blockedId: "c" });
  const result = await getBlockedUsers._handler(ctx, { paginationOpts: pageOpts });
  assert.deepEqual(result.page.map(row => row.blockedId), ["c", "b"]);
  for (const row of result.page) {
    assert.deepEqual(Object.keys(row).sort(), ["_id", "blockedId", "createdAt", "user"]);
    assert.deepEqual(row.user, { fullName: `User ${row.blockedId}`, imageUrl: `https://example.com/${row.blockedId}.png` });
  }
});

test("list retains deleted profiles as null and omits absent optional image URLs", async () => {
  const { ctx, rows } = fixture();
  await blockUser._handler(ctx, { blockedId: "b" });
  await blockUser._handler(ctx, { blockedId: "c" });
  delete rows.users[2].imageUrl;
  rows.users = rows.users.filter(row => row._id !== "b");
  const result = await getBlockedUsers._handler(ctx, { paginationOpts: pageOpts });
  assert.deepEqual(result.page.map(row => row.user), [{ fullName: "User c" }, null]);
});

test("pagination supports boundaries and continuation without losing native metadata", async () => {
  const { ctx } = fixture();
  await blockUser._handler(ctx, { blockedId: "b" });
  await blockUser._handler(ctx, { blockedId: "c" });
  const first = await getBlockedUsers._handler(ctx, { paginationOpts: { numItems: 1, cursor: null } });
  assert.equal(first.isDone, false);
  assert.equal(first.splitCursor, "native-split");
  assert.equal(first.pageStatus, "SplitRecommended");
  const next = await getBlockedUsers._handler(ctx, { paginationOpts: { numItems: 1, cursor: first.continueCursor } });
  assert.deepEqual([...first.page, ...next.page].map(row => row.blockedId), ["c", "b"]);
  assert.equal(next.isDone, true);
  assert.equal((await getBlockedUsers._handler(ctx, { paginationOpts: { numItems: 100, cursor: null } })).page.length, 2);
});

test("pagination rejects invalid sizes and cannot bypass the server read cap", async () => {
  const { ctx, paginationCalls } = fixture();
  for (const numItems of [0, -1, 101, 1.5, NaN, Infinity]) {
    await assert.rejects(getBlockedUsers._handler(ctx, { paginationOpts: { numItems, cursor: null } }), /PAGE_SIZE_MUST_BE_1_TO_100/);
  }
  for (const key of ["maximumRowsRead", "maximumBytesRead"]) {
    for (const value of [0, -1, 1.5, NaN, Infinity]) {
      await assert.rejects(getBlockedUsers._handler(ctx, { paginationOpts: { ...pageOpts, [key]: value } }), /INVALID_PAGINATION_LIMIT/);
    }
  }
  assert.equal(paginationCalls.length, 0);
  const opts = { ...pageOpts, endCursor: "end", id: 7, maximumRowsRead: 5000, maximumBytesRead: 4096 };
  await getBlockedUsers._handler(ctx, { paginationOpts: opts });
  assert.deepEqual(paginationCalls.at(-1), { ...opts, maximumRowsRead: 100 });
  assert.equal(opts.maximumRowsRead, 5000);
  await getBlockedUsers._handler(ctx, { paginationOpts: { ...pageOpts, maximumRowsRead: 5 } });
  assert.equal(paginationCalls.at(-1).maximumRowsRead, 5);
});

test("empty block list is a completed empty page", async () => {
  const { ctx } = fixture();
  const result = await getBlockedUsers._handler(ctx, { paginationOpts: pageOpts });
  assert.deepEqual(result.page, []);
  assert.equal(result.isDone, true);
});

test("server-only relationship helper checks both directions and is not registered", async () => {
  const { ctx } = fixture();
  assert.equal(await hasBlockingRelationship(ctx, "a", "b"), false);
  await blockUser._handler(ctx, { blockedId: "b" });
  assert.equal(await hasBlockingRelationship(ctx, "a", "b"), true);
  assert.equal(await hasBlockingRelationship(ctx, "b", "a"), true);
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_b" });
  await blockUser._handler(ctx, { blockedId: "a" });
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a" });
  await unblockUser._handler(ctx, { blockedId: "b" });
  assert.equal(await hasBlockingRelationship(ctx, "a", "b"), true);
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_b" });
  await unblockUser._handler(ctx, { blockedId: "a" });
  assert.equal(await hasBlockingRelationship(ctx, "a", "b"), false);
  for (const key of ["isQuery", "isMutation", "isAction", "isPublic", "isInternal"]) {
    assert.equal(hasBlockingRelationship[key], undefined);
  }
});

test("public validators accept only target IDs or pagination, never caller identity", () => {
  for (const operation of [blockUser, unblockUser, getBlockingStatus]) {
    const args = JSON.parse(operation.exportArgs());
    assert.deepEqual(Object.keys(args.value), ["blockedId"]);
    assert.equal(args.value.blockedId.fieldType.type, "id");
    assert.equal(args.value.blockedId.fieldType.tableName, "users");
  }
  const listArgs = JSON.parse(getBlockedUsers.exportArgs());
  assert.deepEqual(Object.keys(listArgs.value), ["paginationOpts"]);
  const output = JSON.parse(getBlockingStatus.exportReturns());
  assert.deepEqual(Object.keys(output.value), ["isBlockedByMe"]);
});

test("block and unblock preserve history, friendships, requests, calls, and profiles", async () => {
  const { ctx, rows, writes } = fixture();
  const original = structuredClone(rows);
  delete original.blockedUsers;
  await blockUser._handler(ctx, { blockedId: "b" });
  await getBlockedUsers._handler(ctx, { paginationOpts: pageOpts });
  await getBlockingStatus._handler(ctx, { blockedId: "b" });
  await unblockUser._handler(ctx, { blockedId: "b" });
  const after = structuredClone(rows);
  delete after.blockedUsers;
  assert.deepEqual(after, original);
  assert.ok(writes.every(write => write.table === "blockedUsers"));
});
