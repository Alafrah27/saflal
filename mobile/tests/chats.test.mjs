import test from "node:test";
import assert from "node:assert/strict";
import { getOrCreateDirectChat, getChat, getMyChats, markAsRead } from "../convex/chats.js";
import schema from "../convex/schema.js";

const tables = JSON.parse(schema.export()).tables;
const opts = { numItems: 20, cursor: null };
const key = (a, b) => JSON.stringify([a, b].sort());

// Schema-aware handler fixtures verify bounded lookups and ownership, not
// runtime ID validation, transaction rollback, or concurrent Convex retries.
function fixture(subject = "clerk_a") {
  let sequence = 10;
  const rows = Object.fromEntries(tables.map(table => [table.tableName, []]));
  rows.users = ["a", "b", "c", "d"].map(id => ({
    _id: id, _creationTime: 1, clerkId: `clerk_${id}`, fullName: `User ${id}`,
    imageUrl: `https://example.com/${id}.png`, bio: "Private bio", isOnline: true,
    lastSeenAt: 9, showOnlineStatus: true, showLastSeen: true, isActive: true,
    createdAt: 1, updatedAt: 1,
  }));
  rows.messages.push({ _id: "message", text: "Preserve history" });
  rows.friendRequests.push({ _id: "request", status: "rejected" });
  rows.calls.push({ _id: "call", status: "ended" });
  const writes = [], reads = [], paginationCalls = [];
  const as = id => { subject = id === null ? null : `clerk_${id}`; };
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    db: {
      query(table) {
        assert.ok(["users", "blockedUsers", "friendships", "chats", "chatMembers", "messages"].includes(table));
        const equalities = [];
        const ranges = [];
        let direction = "asc";
        const matches = () => rows[table].filter(row =>
          equalities.every(([field, value]) => row[field] === value) &&
          ranges.every(check => check(row))
        ).sort((a, b) => direction === "desc" ? b._creationTime - a._creationTime : a._creationTime - b._creationTime);
        return {
          withIndex(name, build) {
            const index = tables.find(item => item.tableName === table).indexes.find(item => item.indexDescriptor === name);
            assert.ok(index, `Missing index ${table}.${name}`);
            const builder = {
              eq(field, value) {
                assert.equal(field, index.fields[equalities.length + ranges.length]);
                equalities.push([field, value]); return builder;
              },
              gt(field, value) {
                assert.equal(field, index.fields[equalities.length + ranges.length]);
                ranges.push(row => row[field] > value); return builder;
              },
            };
            build(builder); reads.push({ table, index: name, equalities }); return this;
          },
          order(value) { direction = value; return this; },
          async unique() {
            assert.ok(["users", "blockedUsers", "chatMembers"].includes(table));
            const found = matches(); assert.ok(found.length <= 1); return found[0] ?? null;
          },
          async first() { assert.equal(table, "friendships"); return matches()[0] ?? null; },
          async take(limit) {
            assert.ok(["chats", "chatMembers", "messages"].includes(table));
            assert.ok(limit >= 1 && limit <= 100, "Reads must be bounded");
            return matches().slice(0, limit);
          },
          async paginate(options) {
            assert.equal(table, "chatMembers");
            assert.deepEqual(equalities, [["userId", subject.slice(6)]]);
            paginationCalls.push(options);
            const all = matches(), start = Number(options.cursor ?? 0);
            const page = all.slice(start, start + Math.min(options.numItems, options.maximumRowsRead));
            return { page, continueCursor: String(start + page.length), isDone: start + page.length >= all.length,
              splitCursor: "native-split", pageStatus: "SplitRecommended" };
          },
        };
      },
      async get(table, id) {
        assert.ok(["users", "chats", "messages"].includes(table));
        return rows[table].find(row => row._id === id) ?? null;
      },
      async patch(table, id, fields) {
        assert.ok(["chats", "chatMembers", "messages"].includes(table));
        const row = rows[table].find(r => r._id === id);
        assert.ok(row, `Missing row in ${table} with id ${id}`);
        Object.assign(row, fields);
        writes.push({ table, _id: id, fields: structuredClone(fields) });
      },
      async insert(table, fields) {
        assert.ok(["chats", "chatMembers"].includes(table));
        const _id = `${table}_${++sequence}`;
        rows[table].push({ _id, _creationTime: sequence, ...fields });
        writes.push({ table, _id, fields: structuredClone(fields) }); return _id;
      },
    },
  };
  const friend = (a = "a", b = "b") => rows.friendships.push({
    _id: `friend_${a}_${b}`, _creationTime: 1, user1Id: a, user2Id: b, createdAt: 1,
  });
  const seedChat = async (a = "a", b = "b", fields = {}) => {
    const chatId = await ctx.db.insert("chats", {
      type: "direct", directPairKey: key(a, b), disappearingMessages: false,
      createdAt: 10, updatedAt: 10, ...fields,
    });
    for (const userId of [a, b]) await ctx.db.insert("chatMembers", {
      chatId, userId, joinedAt: 10, isMuted: false, isArchived: false,
    });
    writes.length = 0;
    return chatId;
  };
  return { ctx, rows, writes, reads, paginationCalls, as, friend, seedChat };
}
const create = (ctx, userId = "b") => getOrCreateDirectChat._handler(ctx, { userId });
const get = (ctx, chatId) => getChat._handler(ctx, { chatId });
const list = (ctx, paginationOpts = opts) => getMyChats._handler(ctx, { paginationOpts });

test("all chat functions reject anonymous, missing-profile, and inactive callers", async () => {
  for (const [subject, code] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const { ctx, rows, writes, paginationCalls } = fixture(subject);
    if (subject === "clerk_a") rows.users[0].isActive = false;
    for (const run of [() => create(ctx), () => get(ctx, "missing"), () => list(ctx)]) await assert.rejects(run, code);
    assert.deepEqual(writes, []); assert.deepEqual(paginationCalls, []);
  }
});

test("creation inserts one canonical direct chat and exactly two memberships with server defaults", async () => {
  const { ctx, rows, writes, friend, reads } = fixture(); friend();
  const before = Date.now(), { chatId } = await create(ctx);
  const chat = rows.chats[0];
  assert.equal(chat._id, chatId); assert.equal(chat.type, "direct");
  assert.equal(chat.directPairKey, key("a", "b")); assert.equal(chat.disappearingMessages, false);
  assert.ok(chat.createdAt >= before && chat.createdAt <= Date.now());
  assert.equal(chat.updatedAt, chat.createdAt);
  assert.deepEqual(rows.chatMembers.map(member => member.userId), ["a", "b"]);
  for (const member of rows.chatMembers) assert.deepEqual({
    chatId: member.chatId, joinedAt: member.joinedAt, isArchived: member.isArchived, isMuted: member.isMuted,
  }, { chatId, joinedAt: chat.createdAt, isArchived: false, isMuted: false });
  assert.deepEqual(writes.map(write => write.table), ["chats", "chatMembers", "chatMembers"]);
  assert.ok(reads.some(read => read.table === "chats" && read.index === "by_direct_pair"));
});

test("a reversed stored friendship authorizes creation", async () => {
  const { ctx, rows, friend } = fixture(); friend("b", "a");
  await create(ctx); assert.equal(rows.chats.length, 1);
});

test("self, missing, inactive, and nonfriend targets are rejected without writes", async () => {
  for (const scenario of ["self", "missing", "inactive", "nonfriend", "pending"]) {
    const { ctx, rows, writes, friend } = fixture();
    if (scenario === "inactive") { friend(); rows.users[1].isActive = false; }
    if (scenario === "pending") rows.friendRequests.push({ senderId: "a", receiverId: "b", status: "pending" });
    const target = scenario === "self" ? "a" : scenario === "missing" ? "unknown" : "b";
    await assert.rejects(create(ctx, target), scenario === "self" ? /CANNOT_CHAT_WITH_SELF/ : /USER_UNAVAILABLE/);
    assert.deepEqual(writes, []);
  }
});

test("either block direction rejects creation/reuse without disclosing which direction", async () => {
  for (const [blockerId, blockedId] of [["a", "b"], ["b", "a"]]) {
    for (const existing of [false, true]) {
      const f = fixture(); f.friend(); if (existing) await f.seedChat();
      f.rows.blockedUsers.push({ blockerId, blockedId });
      const before = structuredClone(f.rows);
      await assert.rejects(create(f.ctx), /USER_UNAVAILABLE/);
      assert.deepEqual(f.rows, before); assert.deepEqual(f.writes, []);
    }
  }
});

test("repeated and opposite-participant creation reuse the same chat with no writes", async () => {
  const f = fixture(); f.friend(); const result = await create(f.ctx);
  const before = structuredClone(f.rows); f.writes.length = 0;
  assert.deepEqual(await create(f.ctx), result);
  f.as("b"); assert.deepEqual(await create(f.ctx, "a"), result);
  assert.deepEqual(f.rows, before); assert.deepEqual(f.writes, []);
});

test("reuse requires current friendship and an active recipient", async () => {
  for (const change of ["unfriend", "inactive", "deleted"]) {
    const f = fixture(); f.friend(); await f.seedChat();
    if (change === "unfriend") f.rows.friendships = [];
    if (change === "inactive") f.rows.users[1].isActive = false;
    if (change === "deleted") f.rows.users.splice(1, 1);
    await assert.rejects(create(f.ctx), /USER_UNAVAILABLE/); assert.deepEqual(f.writes, []);
  }
});

test("duplicate pair records fail safely instead of creating or repairing chats", async () => {
  const f = fixture(); f.friend(); await f.seedChat(); await f.seedChat();
  await assert.rejects(create(f.ctx), /CHAT_UNAVAILABLE/); assert.deepEqual(f.writes, []);
});

test("missing and foreign chat IDs share an unavailable response", async () => {
  const f = fixture(), chatId = await f.seedChat(); f.as("c");
  await assert.rejects(get(f.ctx, chatId), /CHAT_UNAVAILABLE/);
  await assert.rejects(get(f.ctx, "missing"), /CHAT_UNAVAILABLE/);
  assert.deepEqual((await list(f.ctx)).page, []); assert.deepEqual(f.writes, []);
});

test("both participants get only their own settings and minimal peer profiles", async () => {
  const f = fixture(); const chatId = await f.seedChat("a", "b", {
    lastMessageId: "message", lastMessageAt: 77, disappearingMessages: true, updatedAt: 78,
  });
  Object.assign(f.rows.chatMembers[0], { isArchived: true, isMuted: true, lastReadAt: 70 });
  assert.deepEqual(await get(f.ctx, chatId), {
    chatId, type: "direct", disappearingMessages: true, createdAt: 10, updatedAt: 78,
    lastMessageId: "message", lastMessageAt: 77,
    lastMessage: { _id: "message", type: "text", text: "Preserve history", senderId: "b", createdAt: 77, status: "sent" },
    unreadCount: 0,
    peer: { _id: "b", fullName: "User b", imageUrl: "https://example.com/b.png" },
    membership: { joinedAt: 10, isArchived: true, isMuted: true, lastReadAt: 70 },
  });
  f.as("b"); const reverse = await get(f.ctx, chatId);
  assert.equal(reverse.peer._id, "a");
  assert.deepEqual(reverse.membership, { joinedAt: 10, isArchived: false, isMuted: false });
  assert.deepEqual(f.writes, []);
});

test("existing membership preserves reads after blocks, lost friendship, or inactive peer", async () => {
  const f = fixture(), chatId = await f.seedChat();
  f.rows.blockedUsers.push({ blockerId: "b", blockedId: "a" }); f.rows.users[1].isActive = false;
  assert.equal((await get(f.ctx, chatId)).chatId, chatId);
  assert.equal((await list(f.ctx)).page[0].chatId, chatId);
  assert.ok(!f.reads.some(read => ["friendships", "blockedUsers"].includes(read.table)));
});

test("deleted peer profiles return null; absent images and optional metadata are omitted", async () => {
  const f = fixture(), chatId = await f.seedChat(); delete f.rows.users[1].imageUrl;
  const result = await get(f.ctx, chatId);
  assert.deepEqual(result.peer, { _id: "b", fullName: "User b" });
  assert.equal(Object.hasOwn(result, "lastMessageId"), false);
  assert.equal(Object.hasOwn(result, "lastMessageAt"), false);
  assert.equal(Object.hasOwn(result, "lastMessage"), false);
  assert.equal(result.unreadCount, 0);
  assert.equal(Object.hasOwn(result.membership, "lastReadAt"), false);
  f.rows.users.splice(1, 1);
  assert.equal((await get(f.ctx, chatId)).peer, null);
  assert.equal((await list(f.ctx)).page[0].peer, null);
});

test("keyless existing chats remain readable without modifying historical data", async () => {
  const f = fixture(), chatId = await f.seedChat(); delete f.rows.chats[0].directPairKey;
  const before = structuredClone(f.rows);
  assert.equal((await get(f.ctx, chatId)).chatId, chatId);
  assert.equal((await list(f.ctx)).page[0].chatId, chatId);
  assert.deepEqual(f.rows, before);
});

test("invalid direct memberships fail reads/reuse and are omitted from lists", async () => {
  for (const corrupt of ["missingPeer", "duplicateOwn", "duplicatePeer", "extra", "wrongPeer", "wrongKey", "missingChat", "wrongType"]) {
    const f = fixture(); f.friend(); const chatId = await f.seedChat();
    if (corrupt === "missingPeer") f.rows.chatMembers.pop();
    if (corrupt === "duplicateOwn") f.rows.chatMembers.push({ ...f.rows.chatMembers[0], _id: "duplicate" });
    if (corrupt === "duplicatePeer") f.rows.chatMembers[1].userId = "a";
    if (corrupt === "extra") f.rows.chatMembers.push({ ...f.rows.chatMembers[1], _id: "extra", userId: "c" });
    if (corrupt === "wrongPeer") f.rows.chatMembers[1].userId = "c";
    if (corrupt === "wrongKey") f.rows.chats[0].directPairKey = key("a", "c");
    if (corrupt === "missingChat") f.rows.chats = [];
    if (corrupt === "wrongType") f.rows.chats[0].type = "group";
    await assert.rejects(get(f.ctx, chatId), /CHAT_UNAVAILABLE/);
    assert.deepEqual((await list(f.ctx)).page, []);
    if (!["wrongKey", "missingChat"].includes(corrupt)) await assert.rejects(create(f.ctx), /CHAT_UNAVAILABLE/);
    assert.deepEqual(f.writes, []);
  }
});

test("caller-scoped pagination is newest-created first, including archived chats", async () => {
  const f = fixture(), first = await f.seedChat(), second = await f.seedChat("a", "c");
  await f.seedChat("b", "d"); f.rows.chatMembers.find(member => member.chatId === first && member.userId === "a").isArchived = true;
  const page1 = await list(f.ctx, { numItems: 1, cursor: null });
  assert.deepEqual(page1.page.map(chat => chat.chatId), [second]); assert.equal(page1.isDone, false);
  const page2 = await list(f.ctx, { numItems: 1, cursor: page1.continueCursor });
  assert.deepEqual(page2.page.map(chat => chat.chatId), [first]); assert.equal(page2.isDone, true);
  assert.equal(page2.page[0].membership.isArchived, true);
  assert.equal(page2.splitCursor, "native-split"); assert.equal(page2.pageStatus, "SplitRecommended");
});

test("sparse and exhausted pages preserve native continuation metadata", async () => {
  const f = fixture(), valid = await f.seedChat();
  await f.ctx.db.insert("chatMembers", { chatId: "orphan", userId: "a", joinedAt: 11, isMuted: false, isArchived: false });
  const page1 = await list(f.ctx, { numItems: 1, cursor: null });
  assert.deepEqual(page1.page, []); assert.equal(page1.isDone, false); assert.equal(page1.continueCursor, "1");
  const page2 = await list(f.ctx, { numItems: 1, cursor: page1.continueCursor });
  assert.deepEqual(page2.page.map(chat => chat.chatId), [valid]); assert.equal(page2.isDone, true);
  const end = await list(f.ctx, { numItems: 1, cursor: page2.continueCursor });
  assert.deepEqual(end.page, []); assert.equal(end.isDone, true);
});

test("pagination rejects invalid sizes/limits and enforces its server ceiling", async () => {
  const f = fixture();
  for (const numItems of [0, -1, 101, 1.5, NaN, Infinity]) await assert.rejects(list(f.ctx, { numItems, cursor: null }), /PAGE_SIZE_MUST_BE_1_TO_100/);
  for (const field of ["maximumRowsRead", "maximumBytesRead"]) {
    for (const limit of [0, -1, 1.5, NaN, Infinity]) await assert.rejects(list(f.ctx, { ...opts, [field]: limit }), /INVALID_PAGINATION_LIMIT/);
  }
  assert.deepEqual(f.paginationCalls, []);
  const options = { numItems: 100, cursor: null, maximumRowsRead: 500, maximumBytesRead: 4096, id: 9, endCursor: "end" };
  await list(f.ctx, options); assert.deepEqual(f.paginationCalls.at(-1), { ...options, maximumRowsRead: 100 });
  assert.equal(options.maximumRowsRead, 500);
  await list(f.ctx, { numItems: 1, cursor: null, maximumRowsRead: 1 });
  assert.equal(f.paginationCalls.at(-1).maximumRowsRead, 1);
});

test("chat operations preserve profiles, friendships, requests, blocks, messages, and calls", async () => {
  const f = fixture(); f.friend(); const before = structuredClone(f.rows);
  const { chatId } = await create(f.ctx); await get(f.ctx, chatId); await list(f.ctx);
  for (const table of Object.keys(f.rows).filter(table => !["chats", "chatMembers"].includes(table))) assert.deepEqual(f.rows[table], before[table]);
});

test("public validators use Convex IDs and reveal no private identity/presence fields", () => {
  for (const [fn, field, table] of [[getOrCreateDirectChat, "userId", "users"], [getChat, "chatId", "chats"], [markAsRead, "chatId", "chats"]]) {
    const args = JSON.parse(fn.exportArgs()).value;
    assert.deepEqual(Object.keys(args), fn === markAsRead ? [field, "messageId"] : [field]); assert.equal(args[field].fieldType.type, "id");
    assert.equal(args[field].fieldType.tableName, table);
  }
  assert.deepEqual(Object.keys(JSON.parse(getMyChats.exportArgs()).value), ["paginationOpts"]);
  const view = JSON.parse(getChat.exportReturns()).value;
  assert.deepEqual(Object.keys(view).sort(), ["chatId", "createdAt", "disappearingMessages", "lastMessage", "lastMessageAt", "lastMessageId", "membership", "peer", "type", "unreadCount", "updatedAt"]);
  const peer = view.peer.fieldType.value.find(variant => variant.type === "object").value;
  assert.deepEqual(Object.keys(peer).sort(), ["_id", "fullName", "imageUrl", "nickName"]);
  assert.deepEqual(Object.keys(view.membership.fieldType.value).sort(), ["isArchived", "isMuted", "joinedAt", "lastReadAt"]);
});

test("markAsRead updates lastReadAt and clears unread message counts", async () => {
  const f = fixture(); f.friend(); const chatId = await f.seedChat("a", "b", {
    lastMessageId: "msg_2", lastMessageAt: 150,
  });
  // Add 2 messages from peer "b"
  f.rows.messages.push(
    { _id: "msg_1", _creationTime: 110, chatId, senderId: "b", type: "text", text: "First unread", status: "sent", createdAt: 110 },
    { _id: "msg_2", _creationTime: 150, chatId, senderId: "b", type: "text", text: "Second unread", status: "sent", createdAt: 150 },
  );
  // User "a" last read at 100
  const memberA = f.rows.chatMembers.find(m => m.chatId === chatId && m.userId === "a");
  memberA.lastReadAt = 100;

  // Before marking read: 2 unread messages
  const chatBefore = await get(f.ctx, chatId);
  assert.equal(chatBefore.unreadCount, 2);
  assert.equal(chatBefore.lastMessage.text, "Second unread");

  // Mark as read
  await markAsRead._handler(f.ctx, { chatId });
  assert.ok(memberA.lastReadAt >= 150);

  // After marking read: 0 unread messages
  const chatAfter = await get(f.ctx, chatId);
  assert.equal(chatAfter.unreadCount, 0);

  // The membership cursor projects read state without rewriting message history.
  assert.deepEqual(memberA.readThrough, { createdAt: 150, creationTime: 150 });
  assert.equal(chatAfter.lastMessage.status, "read");

  // Unauthorized non-member rejects
  f.as("c");
  await assert.rejects(markAsRead._handler(f.ctx, { chatId }), /CHAT_UNAVAILABLE/);
});

