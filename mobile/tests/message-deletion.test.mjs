import test from "node:test";
import assert from "node:assert/strict";
import { deleteForEveryone, sendText, sendAudio, listMessages } from "../convex/messages.js";
import { getOrCreateDirectChat, getChat, markAsRead } from "../convex/chats.js";
import { getAudioFile, cleanup } from "../convex/voice.js";
import { downloadVoice } from "../convex/http.js";
import { resolvePushEvent } from "../convex/lib/push.js";
import { VOICE_STORAGE_TYPE } from "../convex/lib/voicePolicy.js";
import { historyFixture } from "./fixtures/historyFixture.mjs";

const key = "delete-operation-key-0001";
const paginationOpts = { numItems: 20, cursor: null };
async function fixture(type = "text", fields = {}) {
  const f = historyFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  const files = new Map(), deleted = [];
  f.ctx.db.system = { get: async (_table, id) => files.get(id) ?? null };
  f.ctx.storage = {
    get: async id => files.get(id)?.blob ?? null,
    delete: async id => { assert.ok(files.has(id), "Missing files must not be deleted twice"); files.delete(id); deleted.push(id); },
  };
  f.ctx.runQuery = (_ref, args) => getAudioFile._handler(f.ctx, args);
  const blob = new Blob([new Uint8Array(64)], { type: VOICE_STORAGE_TYPE });
  files.set("voice-file", { _id: "voice-file", size: blob.size, contentType: blob.type, blob });
  const messageId = await f.ctx.db.insert("messages", { chatId, senderId: "a", clientMessageId: key,
    type, status: "sent", createdAt: 100, updatedAt: 100,
    ...(type === "text" ? { text: "Private original text" } : { audioStorageId: "voice-file", audioDuration: 12 }), ...fields });
  await f.ctx.db.patch("chats", chatId, { lastMessageId: messageId, lastMessageAt: 100 });
  f.writes.length = 0;
  return { ...f, chatId, messageId, files, deleted,
    remove: () => deleteForEveryone._handler(f.ctx, { messageId }),
    view: () => getChat._handler(f.ctx, { chatId }),
    list: (opts = paginationOpts) => listMessages._handler(f.ctx, { chatId, paginationOpts: opts }),
    row: () => f.rows.messages.find(message => message._id === messageId),
  };
}

test("deletion accepts only a message ID; sender identity always comes from Clerk", () => {
  const args = JSON.parse(deleteForEveryone.exportArgs()).value;
  assert.deepEqual(Object.keys(args), ["messageId"]);
  assert.equal(args.messageId.fieldType.tableName, "messages");
});

test("only an active authenticated sender with valid direct membership can delete", async () => {
  for (const actor of [null, "missing", "b", "c", "inactive", "missing-membership", "duplicate-membership", "wrong-pair"]) {
    const f = await fixture();
    if (actor === "inactive") f.rows.users[0].isActive = false;
    else if (actor === "missing-membership") f.rows.chatMembers.splice(0, 1);
    else if (actor === "duplicate-membership") f.rows.chatMembers.push({ ...f.rows.chatMembers[0], _id: "duplicate" });
    else if (actor === "wrong-pair") f.rows.chats[0].directPairKey = "wrong";
    else f.as(actor);
    await assert.rejects(f.remove);
    assert.deepEqual(f.writes, []); assert.equal(f.row().text, "Private original text");
  }
  const f = await fixture();
  await assert.rejects(deleteForEveryone._handler(f.ctx, { messageId: "missing" }), /MESSAGE_UNAVAILABLE/);
});

test("replacing text removes its payload while keeping chronology, expiry, retry identity and chat metadata", async () => {
  const expiresAt = Date.now() + 100000, f = await fixture("text", { expiresAt });
  const before = structuredClone(f.row()), chats = structuredClone(f.rows.chats), members = structuredClone(f.rows.chatMembers);
  await f.remove(); const row = f.row();
  for (const field of ["_id", "_creationTime", "chatId", "senderId", "type", "createdAt", "expiresAt", "clientMessageId", "status"]) assert.equal(row[field], before[field]);
  assert.ok(row.deletedAt >= before.updatedAt); assert.equal(row.updatedAt, row.deletedAt);
  for (const field of ["text", "audioStorageId", "audioDuration"]) assert.equal(field in row, false);
  assert.deepEqual(f.rows.chats, chats); assert.deepEqual(f.rows.chatMembers, members);
  assert.deepEqual(f.writes.map(write => write.type), ["replace"]); assert.equal(f.scheduled.length, 0);
  await f.remove(); assert.equal(f.writes.length, 1);
});

test("history hidden by a personal clear or expiry cannot be newly deleted", async () => {
  for (const reason of ["cleared", "expired"]) {
    const f = await fixture();
    if (reason === "cleared") f.rows.chatMembers[0].clearedThrough = { createdAt: 100, creationTime: f.row()._creationTime };
    else f.row().expiresAt = Date.now() - 1;
    await assert.rejects(f.remove, /MESSAGE_UNAVAILABLE/); assert.deepEqual(f.writes, []);
  }
});

test("owners retain deletion after blocking, loss of friendship or peer deactivation", async () => {
  for (const reason of ["unfriend", "block-a", "block-b", "inactive-peer"]) {
    const f = await fixture();
    if (reason === "unfriend") f.rows.friendships.length = 0;
    else if (reason === "inactive-peer") f.rows.users[1].isActive = false;
    else f.rows.blockedUsers.push({ blockerId: reason === "block-a" ? "a" : "b", blockedId: reason === "block-a" ? "b" : "a" });
    await f.remove(); assert.equal(typeof f.row().deletedAt, "number");
    f.as("b"); await assert.rejects(f.remove);
  }
});

test("deleted text and voice project compatible placeholders to both users and leave unread counts at zero", async () => {
  for (const type of ["text", "audio"]) {
    const f = await fixture(type); f.as("b");
    assert.equal((await f.view()).unreadCount, 1); f.as("a"); await f.remove();
    for (const actor of ["a", "b"]) {
      f.as(actor);
      const view = await f.view(), page = await f.list(), message = page.page[0];
      assert.equal(view.unreadCount, 0); assert.equal(view.lastMessage.deletedAt, f.row().deletedAt);
      assert.equal(message._id, f.messageId); assert.equal(message.type, "text");
      assert.equal(message.text, "Message deleted."); assert.equal(message.deletedAt, f.row().deletedAt);
      assert.equal(message.audioDuration, undefined); assert.equal(message.audioStorageId, undefined);
      assert.equal(view.lastMessage.audioDuration, undefined); assert.equal(view.lastMessage.text, "Message deleted.");
      assert.equal(page.splitCursor, "split"); assert.equal(page.pageStatus, "SplitRecommended");
    }
  }
});

test("deleted rows retain pagination positions, IDs and native metadata across page boundaries", async () => {
  const f = await fixture();
  for (let index = 1; index <= 24; index++) await f.ctx.db.insert("messages", { chatId: f.chatId, senderId: "a", type: "text",
    text: `row ${index}`, createdAt: 100 + index, updatedAt: 100 + index, status: "sent" });
  const first = await f.list(); await f.remove();
  const second = await f.list({ ...paginationOpts, cursor: first.continueCursor });
  assert.equal(first.page.length, 20); assert.equal(second.page.length, 5); assert.equal(second.isDone, true);
  assert.equal(second.page.at(-1)._id, f.messageId); assert.equal(typeof second.page.at(-1).deletedAt, "number");
  assert.equal(new Set([...first.page, ...second.page].map(row => row._id)).size, 25);
});

test("read cursors still acknowledge deleted rows without swallowing newer same-millisecond messages", async () => {
  const f = await fixture(); await f.remove(); f.as("b");
  await markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: f.messageId });
  const readThrough = structuredClone(f.rows.chatMembers[1].readThrough);
  const next = await f.ctx.db.insert("messages", { chatId: f.chatId, senderId: "a", type: "text", text: "new",
    createdAt: 100, updatedAt: 100, status: "sent" });
  await f.ctx.db.patch("chats", f.chatId, { lastMessageId: next, lastMessageAt: 100 });
  assert.equal((await f.view()).unreadCount, 1);
  await markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: f.messageId });
  assert.deepEqual(f.rows.chatMembers[1].readThrough, readThrough);
  assert.equal((await f.view()).unreadCount, 1);
});

test("a deleted unread message suppresses its queued push without scheduling a deletion notification", async () => {
  const f = await fixture();
  assert.ok(await resolvePushEvent(f.ctx, { kind: "message", messageId: f.messageId }));
  await f.remove();
  assert.equal(await resolvePushEvent(f.ctx, { kind: "message", messageId: f.messageId }), null);
  assert.equal(f.scheduled.length, 0); assert.equal(f.rows.pushDeliveries.length, 0);
});

test("text send retries return the tombstone without resurrecting content or sending another push", async () => {
  const f = await fixture(); await f.remove(); const writes = f.writes.length;
  for (const text of ["Private original text", "Changed retry body"]) {
    assert.deepEqual(await sendText._handler(f.ctx, { chatId: f.chatId, text, clientMessageId: key }), { messageId: f.messageId });
  }
  await assert.rejects(sendAudio._handler(f.ctx, { chatId: f.chatId, uploadId: "missing", clientMessageId: key }), /MESSAGE_KEY_REUSED/);
  assert.equal(f.writes.length, writes); assert.equal(f.rows.messages.length, 1); assert.equal(f.row().text, undefined);
});

test("audio deletion removes private storage, denies both users and all subsequent HTTP byte ranges", async () => {
  const f = await fixture("audio");
  assert.equal(await getAudioFile._handler(f.ctx, { messageId: f.messageId }), "voice-file");
  await f.remove(); assert.deepEqual(f.deleted, ["voice-file"]); assert.equal(f.row().audioStorageId, undefined);
  for (const actor of ["a", "b"]) {
    f.as(actor); await assert.rejects(getAudioFile._handler(f.ctx, { messageId: f.messageId }), /AUDIO_UNAVAILABLE/);
    const response = await downloadVoice._handler(f.ctx, new Request(`https://example/voice/${f.messageId}`, { headers: { Range: "bytes=0-15" } }));
    assert.equal(response.status, 400); // Preserve the existing private attachment error contract.
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});

test("audio retries succeed after the consumed upload has been reclaimed and cannot recreate payload", async () => {
  const f = await fixture("audio"); await f.remove(); const writes = f.writes.length;
  assert.deepEqual(await sendAudio._handler(f.ctx, { chatId: f.chatId, uploadId: "reclaimed-upload", clientMessageId: key }), { messageId: f.messageId });
  await assert.rejects(sendText._handler(f.ctx, { chatId: f.chatId, text: "wrong type", clientMessageId: key }), /MESSAGE_KEY_REUSED/);
  assert.equal(f.writes.length, writes); assert.equal(f.files.size, 0); assert.equal(f.row().type, "audio");
});

test("shared audio is retained until its last message is deleted, then missing-file cleanup is idempotent", async () => {
  const f = await fixture("audio");
  const { _id, _creationTime, ...content } = f.row();
  const second = await f.ctx.db.insert("messages", { ...content, clientMessageId: "another-voice-operation" });
  await f.remove(); assert.deepEqual(f.deleted, []); assert.ok(f.files.has("voice-file"));
  await deleteForEveryone._handler(f.ctx, { messageId: second }); assert.deepEqual(f.deleted, ["voice-file"]);
  await f.ctx.db.insert("audioUploads", { ownerId: "a", chatId: f.chatId, clientMessageId: key, status: "consumed", storageId: "voice-file", expiresAt: 1, createdAt: 1 });
  await cleanup._handler(f.ctx, {}); await cleanup._handler(f.ctx, {}); await f.remove();
  assert.deepEqual(f.deleted, ["voice-file"]); assert.equal(f.rows.audioUploads.length, 0);
});

test("missing audio blobs do not prevent deletion and tombstones keep their original expiry", async () => {
  const f = await fixture("audio", { expiresAt: Date.now() + 10000 }); f.files.clear();
  await f.remove(); assert.deepEqual(f.deleted, []);
  f.row().expiresAt = Date.now() - 1;
  assert.equal((await f.list()).page.length, 0); assert.equal((await f.view()).lastMessage, undefined);
  await f.remove(); assert.equal(f.writes.filter(write => write.type === "replace").length, 1);
});
