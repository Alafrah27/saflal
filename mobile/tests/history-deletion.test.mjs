import test from "node:test";
import assert from "node:assert/strict";
import { deleteForMe, getOrCreateDirectChat, getMyChats, getChat, markAsRead } from "../convex/chats.js";
import { sendText, sendAudio, listMessages } from "../convex/messages.js";
import { deleteHistory, history, reserve } from "../convex/calls.js";
import { getAudioFile } from "../convex/voice.js";
import { enqueueMessagePush, deliveryPayload } from "../convex/lib/push.js";
import { backfill, verify } from "../convex/migrations/historyVisibility.js";
import { VOICE_STORAGE_TYPE } from "../convex/lib/voicePolicy.js";
import { historyFixture } from "./fixtures/historyFixture.mjs";

const page = { numItems: 20, cursor: null };
const listChats = (f, paginationOpts = page) => getMyChats._handler(f.ctx, { paginationOpts });
const listMessagesFor = (f, chatId, paginationOpts = page) => listMessages._handler(f.ctx, { chatId, paginationOpts });
async function fixture() {
  const f = historyFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  return { ...f, chatId, send: (text, clientMessageId) => sendText._handler(f.ctx, { chatId, text, clientMessageId }),
    clear: (chatIds = [chatId]) => deleteForMe._handler(f.ctx, { chatIds }) };
}
async function ready(fn) {
  const previous = process.env.HISTORY_LISTS_READY; process.env.HISTORY_LISTS_READY = "true";
  try { return await fn(); } finally { if (previous === undefined) delete process.env.HISTORY_LISTS_READY; else process.env.HISTORY_LISTS_READY = previous; }
}
async function audio(f, key = "audio-message-key-0001") {
  const uploadId = await f.ctx.db.insert("audioUploads", { chatId: f.chatId, ownerId: "a", clientMessageId: key,
    status: "ready", storageId: "audio_storage", audioDuration: 2, expiresAt: Date.now() + 60000 });
  f.ctx.db.system = { get: async () => ({ size: 1024, contentType: VOICE_STORAGE_TYPE }) };
  return sendAudio._handler(f.ctx, { chatId: f.chatId, uploadId, clientMessageId: key });
}

test("delete mutations require authentication, unique bounded IDs and ownership before any batch write", async () => {
  for (const method of [deleteForMe, deleteHistory]) assert.equal(Object.keys(JSON.parse(method.exportArgs()).value).length, 1);
  for (const kind of ["chat", "call"]) {
    const f = await fixture(), run = ids => kind === "chat" ? f.clear(ids) : deleteHistory._handler(f.ctx, { callIds: ids });
    for (const ids of [[], ["same", "same"], Array.from({ length: 51 }, (_, i) => `${i}`)]) await assert.rejects(run(ids), /DELETE_REQUIRES/);
    f.as(null); await assert.rejects(run([f.chatId]), /UNAUTHENTICATED/); f.as("a");
    if (kind === "call") await f.ctx.db.insert("calls", { _id: "unused", callerId: "a", receiverId: "b", status: "ended" });
    const before = f.writes.length;
    await assert.rejects(run([kind === "chat" ? f.chatId : f.rows.calls[0]._id, "unowned"]), /UNAVAILABLE/);
    assert.equal(f.writes.length, before);
    f.as("c"); await assert.rejects(run([f.chatId]), /UNAVAILABLE/);
  }
});

test("clearing a chat hides only the owner's list, messages, preview and unread count while preserving shared records", async () => ready(async () => {
  const f = await fixture(); f.as("b"); await f.send("private history", "message-key-00000001"); f.as("a");
  assert.equal((await getChat._handler(f.ctx, { chatId: f.chatId })).unreadCount, 1);
  const count = f.rows.messages.length;
  await f.clear(); assert.equal((await listChats(f)).page.length, 0);
  assert.equal((await listMessagesFor(f, f.chatId)).page.length, 0);
  const detail = await getChat._handler(f.ctx, { chatId: f.chatId });
  assert.equal(detail.unreadCount, 0); assert.equal(detail.lastMessage, undefined); assert.equal(detail.lastMessageAt, undefined);
  await markAsRead._handler(f.ctx, { chatId: f.chatId }); assert.equal(f.rows.messages[0].status, "sent");
  const writes = f.writes.length; await f.clear(); assert.equal(f.writes.length, writes);
  f.as("b"); assert.equal((await listChats(f)).page.length, 1); assert.equal((await listMessagesFor(f, f.chatId)).page.length, 1);
  assert.equal(f.rows.messages.length, count); assert.equal(f.rows.chatMembers.length, 2);
}));

test("manual reopening retains the clear cutoff; future text/voice restores both inboxes and retry does not reorder", async () => ready(async () => {
  const f = await fixture(); await f.send("old", "message-key-00000002"); await f.clear();
  await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  assert.equal((await listChats(f)).page.length, 1); assert.equal((await listMessagesFor(f, f.chatId)).page.length, 0);
  await f.clear(); f.as("b"); await f.send("new", "message-key-00000003"); f.as("a");
  assert.deepEqual((await listMessagesFor(f, f.chatId)).page.map(m => m.text), ["new"]);
  await f.clear(); await audio(f);
  assert.equal((await listChats(f)).page.length, 1); assert.equal((await listMessagesFor(f, f.chatId)).page[0].type, "audio");
  const writes = f.writes.length; await audio(f); assert.equal(f.writes.length, writes + 1); // The test helper stages another upload; commit itself is idempotent.
}));

test("equal-timestamp messages committed after a clear remain visible; either send/delete serialization is safe", async () => {
  const f = await fixture(); await f.send("before", "message-key-00000004");
  const first = f.rows.messages[0]; first.createdAt = Date.now() + 1000; f.rows.chats[0].lastMessageAt = first.createdAt;
  await f.clear(); f.as("b"); await f.send("after", "message-key-00000005"); f.as("a");
  assert.equal(f.rows.messages[1].createdAt, first.createdAt);
  assert.deepEqual((await listMessagesFor(f, f.chatId)).page.map(m => m.text), ["after"]);
  await f.clear(); assert.equal((await listMessagesFor(f, f.chatId)).page.length, 0);
});

test("cleared audio cannot be fetched by its former viewer; the other participant retains access and the storage reference", async () => {
  const f = await fixture(), { messageId } = await audio(f);
  assert.equal(await getAudioFile._handler(f.ctx, { messageId }), "audio_storage");
  await f.clear(); await assert.rejects(getAudioFile._handler(f.ctx, { messageId }), /AUDIO_UNAVAILABLE/);
  f.as("b"); assert.equal(await getAudioFile._handler(f.ctx, { messageId }), "audio_storage");
  assert.equal(f.rows.messages[0].audioStorageId, "audio_storage");
});

test("queued alerts for cleared messages are suppressed without changing the sender's history", async () => {
  const f = await fixture(); await f.device("b");
  const { messageId } = await f.send("queued", "message-key-00000006");
  assert.equal(f.rows.pushDeliveries.length, 1); const delivery = f.rows.pushDeliveries[0];
  assert.ok(await deliveryPayload(f.ctx, delivery));
  f.as("b"); await f.clear(); assert.equal(await deliveryPayload(f.ctx, delivery), null);
  await enqueueMessagePush(f.ctx, { messageId }); assert.equal(f.rows.pushDeliveries.length, 1);
  f.as("a"); assert.equal((await listMessagesFor(f, f.chatId)).page.length, 1);
});

test("chat pagination uses indexed latest activity globally, stable ties and live reordering rather than page-local sorting", async () => ready(async () => {
  const f = await fixture();
  for (let i = 0; i < 24; i++) {
    const id = await f.ctx.db.insert("chats", { type: "direct", createdAt: i + 1, updatedAt: i + 1 });
    for (const userId of ["a", "b"]) await f.ctx.db.insert("chatMembers", { chatId: id, userId, joinedAt: i + 1,
      isArchived: false, isMuted: false, isHidden: false, lastActivityAt: 100 + i });
  }
  for (const m of f.rows.chatMembers.filter(m => m.chatId === f.chatId)) m.lastActivityAt = 1;
  const first = await listChats(f), second = await listChats(f, { ...page, cursor: first.continueCursor });
  assert.equal(first.page.length, 20); assert.equal(second.page.length, 5); assert.equal(second.page.at(-1).chatId, f.chatId);
  await f.send("most recent", "message-key-00000007");
  assert.equal((await listChats(f)).page[0].chatId, f.chatId);
  const before = f.rows.chatMembers.filter(m => m.chatId === f.chatId).map(m => m.lastActivityAt);
  await f.send("most recent", "message-key-00000007"); await markAsRead._handler(f.ctx, { chatId: f.chatId });
  assert.deepEqual(f.rows.chatMembers.filter(m => m.chatId === f.chatId).map(m => m.lastActivityAt), before);
  assert.ok(f.reads.every(read => read.limit <= 100));
}));

test("call deletion is personal, idempotent and visibility-aware pagination cannot revive a removed boundary", async () => ready(async () => {
  const f = await fixture();
  for (let i = 0; i < 25; i++) await f.ctx.db.insert("calls", { callerId: i % 2 ? "a" : "b", receiverId: i % 2 ? "b" : "a",
    callerHistoryVisible: true, receiverHistoryVisible: true, createdAt: i, status: "ended", streamCallId: `call_${i}` });
  const target = f.rows.calls.at(-1), args = { callIds: [target._id] };
  await deleteHistory._handler(f.ctx, args); const writes = f.writes.length;
  await deleteHistory._handler(f.ctx, args); assert.equal(f.writes.length, writes);
  const incoming = await history._handler(f.ctx, { direction: "incoming", paginationOpts: { ...page, numItems: 4 } });
  assert.ok(!incoming.page.some(c => c._id === target._id)); assert.equal(incoming.page.length, 4);
  const next = await history._handler(f.ctx, { direction: "incoming", paginationOpts: { ...page, numItems: 4, cursor: incoming.continueCursor } });
  assert.ok(next.page.every(c => c.createdAt < incoming.page.at(-1).createdAt));
  f.as("b"); const other = await history._handler(f.ctx, { direction: "outgoing", paginationOpts: page });
  assert.ok(other.page.some(c => c._id === target._id)); assert.equal(f.rows.calls.length, 25);
  for (const call of other.page) { assert.equal(call.callerHistoryVisible, undefined); assert.equal(call.receiverHistoryVisible, undefined); }
}));

test("a batch containing a live or unrelated call is rejected before any history flag changes", async () => {
  const f = await fixture();
  for (const status of ["ended", "ringing", "accepted"]) await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", status });
  const ids = f.rows.calls.map(c => c._id), writes = f.writes.length;
  for (const id of ids.slice(1)) await assert.rejects(deleteHistory._handler(f.ctx, { callIds: [ids[0], id] }), /CALL_HISTORY_ACTIVE/);
  assert.equal(f.writes.length, writes);
  f.as("c"); await assert.rejects(deleteHistory._handler(f.ctx, { callIds: [ids[0]] }), /CALL_UNAVAILABLE/);
});

test("same-millisecond messages reorder old conversations by message creation order, not conversation age", async () => ready(async () => {
  const f = await fixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "c", createdAt: 1 });
  const other = (await getOrCreateDirectChat._handler(f.ctx, { userId: "c" })).chatId;
  const at = Date.now() + 1000;
  for (const chat of f.rows.chats) chat.lastMessageAt = at;
  await sendText._handler(f.ctx, { chatId: other, text: "first", clientMessageId: "same-millisecond-key-0001" });
  await f.send("last", "same-millisecond-key-0002");
  const result = await listChats(f, { numItems: 1, cursor: null });
  assert.equal(result.page[0].chatId, f.chatId);
  assert.equal((await listChats(f, { numItems: 1, cursor: result.continueCursor })).page[0].chatId, other);
}));

test("legacy-query rollback still respects saved personal deletion markers", async () => {
  const before = process.env.HISTORY_LISTS_READY; delete process.env.HISTORY_LISTS_READY;
  try {
    const f = await fixture(); await f.send("old", "rollback-message-key-001"); await f.clear();
    assert.equal((await listChats(f)).page.length, 0); assert.equal((await listMessagesFor(f, f.chatId)).page.length, 0);
    const id = await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", status: "ended", createdAt: 1 });
    await deleteHistory._handler(f.ctx, { callIds: [id] });
    assert.equal((await history._handler(f.ctx, { direction: "outgoing", paginationOpts: page })).page.length, 0);
  } finally { if (before !== undefined) process.env.HISTORY_LISTS_READY = before; }
});

test("new call reservations initialize both visibility flags without changing Stream authorization", async () => {
  const f = await fixture();
  const result = await reserve._handler(f.ctx, { chatId: f.chatId, requestId: "call-request-key-00001" });
  assert.equal(result.call.callerHistoryVisible, true); assert.equal(result.call.receiverHistoryVisible, true);
});

test("bounded migration initializes only missing fields and verification detects incomplete pages", async () => {
  const f = await fixture();
  const own = f.rows.chatMembers[0]; own.isHidden = true; own.clearedThrough = { createdAt: 4, creationTime: 5 };
  delete own.lastActivityAt;
  await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", callerHistoryVisible: false });
  assert.equal((await verify._handler(f.ctx, { table: "calls", cursor: null })).missing, 1);
  for (const table of ["chatMembers", "calls"]) {
    const first = await backfill._handler(f.ctx, { table, cursor: null }); assert.ok(first.scanned <= 50);
    assert.equal((await verify._handler(f.ctx, { table, cursor: null })).missing, 0);
    assert.equal((await backfill._handler(f.ctx, { table, cursor: null })).changed, 0);
  }
  assert.equal(own.isHidden, true); assert.deepEqual(own.clearedThrough, { createdAt: 4, creationTime: 5 });
  assert.equal(f.rows.calls[0].callerHistoryVisible, false); assert.equal(f.rows.calls[0].receiverHistoryVisible, true);
});

test("migration continues across more than two bounded pages without resetting existing call deletions", async () => {
  const f = historyFixture();
  for (let i = 0; i < 125; i++) await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", callerHistoryVisible: i % 3 === 0 ? false : undefined });
  let cursor = null, scanned = 0, pages = 0;
  do {
    const result = await backfill._handler(f.ctx, { table: "calls", cursor });
    assert.ok(result.scanned <= 50); scanned += result.scanned; pages++;
    if (result.isDone) break;
    cursor = result.continueCursor;
  } while (pages < 10);
  assert.equal(scanned, 125); assert.equal(pages, 3);
  assert.equal(f.rows.calls.filter(c => c.callerHistoryVisible === false).length, 42);
  assert.ok(f.rows.calls.every(c => typeof c.receiverHistoryVisible === "boolean" && typeof c.callerHistoryVisible === "boolean"));
});
