import test from "node:test";
import assert from "node:assert/strict";
import { sendText, listMessages, getSendPermission } from "../convex/messages.js";
import { getOrCreateDirectChat } from "../convex/chats.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

const key = "test-message-key-0001";
const page = { numItems: 20, cursor: null };
async function fixture() {
  const f = pushFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  const pages = [], query = f.ctx.db.query.bind(f.ctx.db);
  f.ctx.db.query = table => {
    const result = query(table);
    if (table !== "messages") return result;
    const conditions = [], withIndex = result.withIndex.bind(result);
    result.withIndex = (name, build) => {
      withIndex(name, original => {
        const builder = { eq(field, value) { conditions.push([field, value]); original.eq(field, value); return builder; } };
        return build(builder);
      }); return result;
    };
    result.paginate = async opts => {
      pages.push(opts);
      const rows = f.rows.messages.filter(row => conditions.every(([field, value]) => row[field] === value))
        .sort((a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime);
      const start = Number(opts.cursor ?? 0), count = Math.min(opts.numItems, opts.maximumRowsRead);
      return { page: rows.slice(start, start + count), continueCursor: String(start + Math.min(count, rows.length - start)),
        isDone: start + count >= rows.length, splitCursor: "native-split", pageStatus: "SplitRecommended" };
    };
    return result;
  };
  f.writes.length = 0;
  return { ...f, chatId, pages,
    send: (text = "hello", clientMessageId = key) => sendText._handler(f.ctx, { chatId, text, clientMessageId }),
    list: (paginationOpts = page) => listMessages._handler(f.ctx, { chatId, paginationOpts }),
    permission: () => getSendPermission._handler(f.ctx, { chatId }),
  };
}

test("accepted friends can exchange text with authenticated senders, server timestamps, and atomic chat metadata", async () => {
  const f = await fixture(); const start = Date.now();
  assert.equal(await f.permission(), true);
  const { messageId } = await f.send("  hello  "); f.as("b"); await f.send("reply");
  assert.deepEqual(f.rows.messages.map(message => [message.senderId, message.text, message.status]), [["a", "hello", "sent"], ["b", "reply", "sent"]]);
  const first = f.rows.messages.find(message => message._id === messageId);
  assert.ok(first.createdAt >= start); assert.equal(first.expiresAt, undefined);
  assert.equal(f.rows.chats[0].lastMessageId, f.rows.messages[1]._id);
  assert.equal(f.rows.chats[0].lastMessageAt, f.rows.messages[1].createdAt);
});

test("anonymous, missing-profile, inactive, and unrelated users cannot send or list a conversation", async () => {
  for (const actor of [null, "missing", "inactive", "c"]) {
    const f = await fixture();
    if (actor === "inactive") { f.rows.users[0].isActive = false; f.as("a"); } else f.as(actor);
    for (const operation of [f.send, f.list, f.permission]) await assert.rejects(operation);
    assert.deepEqual(f.writes, []);
  }
});

test("pending, declined, absent friendship, deleted/inactive peers, and either block direction prevent sends", async () => {
  for (const reason of ["none", "pending", "rejected", "deleted", "inactive", "block_a", "block_b"]) {
    const f = await fixture();
    if (["none", "pending", "rejected"].includes(reason)) {
      f.rows.friendships.length = 0;
      if (reason !== "none") await f.request({ status: reason });
    }
    if (reason === "deleted") f.rows.users.splice(1, 1);
    if (reason === "inactive") f.rows.users[1].isActive = false;
    if (reason.startsWith("block")) await f.ctx.db.insert("blockedUsers", { blockerId: reason === "block_a" ? "a" : "b", blockedId: reason === "block_a" ? "b" : "a", createdAt: 1 });
    f.writes.length = 0;
    assert.equal(await f.permission(), false);
    await assert.rejects(f.send, /CHAT_UNAVAILABLE/); assert.deepEqual(f.writes, []);
  }
});

test("malformed direct memberships and pair keys fail closed without message writes", async () => {
  for (const corrupt of [f => f.rows.chatMembers.pop(), f => f.rows.chatMembers.push({ ...f.rows.chatMembers[0], _id: "duplicate" }),
    f => { f.rows.chatMembers[1].userId = "a"; }, f => { f.rows.chats[0].directPairKey = "forged"; }]) {
    const f = await fixture(); corrupt(f);
    await assert.rejects(f.send, /CHAT_UNAVAILABLE/); await assert.rejects(f.list, /CHAT_UNAVAILABLE/);
    assert.deepEqual(f.writes, []);
  }
});

test("empty/oversized text and invalid retry keys cannot produce writes", async () => {
  const f = await fixture();
  for (const text of ["", "  \n\t", "x".repeat(4001)]) await assert.rejects(() => f.send(text), /INVALID_MESSAGE_TEXT/);
  for (const id of ["", "short", "x".repeat(101), "a space is invalid"]) await assert.rejects(() => f.send("hello", id), /INVALID_MESSAGE_KEY/);
  assert.deepEqual(f.writes, []);
  await f.send("x".repeat(4000)); assert.equal(f.rows.messages.length, 1);
});

test("same-operation retry creates one message and one push; changing payload under the same key fails", async () => {
  const f = await fixture(); await f.device(); f.writes.length = 0;
  const first = await f.send(); const writes = f.writes.length;
  assert.deepEqual(await f.send(), first); assert.equal(f.writes.length, writes);
  assert.equal(f.rows.messages.length, 1); assert.equal(f.rows.pushDeliveries.length, 1); assert.equal(f.scheduled.length, 1);
  await assert.rejects(() => f.send("changed"), /MESSAGE_KEY_REUSED/);
  f.as("b"); await f.send("reply", key); assert.equal(f.rows.messages.length, 2);
});

test("retry rechecks current authorization after blocking and never restores messaging permission", async () => {
  const f = await fixture(); await f.send();
  await f.ctx.db.insert("blockedUsers", { blockerId: "b", blockedId: "a", createdAt: 1 }); f.writes.length = 0;
  await assert.rejects(f.send, /CHAT_UNAVAILABLE/); assert.deepEqual(f.writes, []);
});

test("message history paginates newest first with native cursor metadata and minimal projections", async () => {
  const f = await fixture();
  for (let i = 0; i < 25; i++) await f.send(`message ${i}`, `message-operation-${String(i).padStart(4, "0")}`);
  const first = await f.list(); assert.equal(first.page.length, 20); assert.equal(first.isDone, false);
  assert.equal(first.page[0].text, "message 24"); assert.equal(first.splitCursor, "native-split");
  const second = await f.list({ ...page, cursor: first.continueCursor }); assert.equal(second.page.length, 5); assert.equal(second.isDone, true);
  assert.equal(new Set([...first.page, ...second.page].map(message => message._id)).size, 25);
  assert.deepEqual(Object.keys(first.page[0]).sort(), ["_id", "senderId", "type", "text", "createdAt", "status"].sort());
  assert.equal(f.pages[0].maximumRowsRead, 100);
});

test("history survives lost friendship and blocking while expired rows are filtered after bounded pagination", async () => {
  const f = await fixture(); await f.send();
  f.rows.messages[0].expiresAt = Date.now() - 1;
  f.rows.friendships.length = 0;
  await f.ctx.db.insert("blockedUsers", { blockerId: "b", blockedId: "a", createdAt: 1 });
  const result = await f.list({ numItems: 1, cursor: null }); assert.deepEqual(result.page, []); assert.equal(result.continueCursor, "1");
  delete f.rows.messages[0].expiresAt;
  assert.equal((await f.list()).page[0].text, "hello");
});

test("message pagination rejects invalid options and caps physical reads", async () => {
  const f = await fixture();
  for (const numItems of [0, 101, 1.2, NaN]) await assert.rejects(() => f.list({ numItems, cursor: null }), /PAGE_SIZE/);
  for (const maximumRowsRead of [0, -1, 1.5]) await assert.rejects(() => f.list({ ...page, maximumRowsRead }), /INVALID_PAGINATION/);
  await f.list({ ...page, maximumRowsRead: 10000 }); assert.equal(f.pages.at(-1).maximumRowsRead, 100);
});

test("existing disappearing setting assigns 30-day deadlines only to newly sent messages", async () => {
  const f = await fixture(); await f.send();
  f.rows.chats[0].disappearingMessages = true; await f.send("expiring", "another-message-key-0001");
  assert.equal(f.rows.messages[0].expiresAt, undefined);
  assert.equal(f.rows.messages[1].expiresAt - f.rows.messages[1].createdAt, 30 * 24 * 60 * 60 * 1000);
});
