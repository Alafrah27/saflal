import test from "node:test";
import assert from "node:assert/strict";
import schema from "../convex/schema.js";
import { getOrCreateDirectChat } from "../convex/chats.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

// Inspect the installed SDK's exported validators, not a replacement validator.
// Actual database rejection/compatibility must be checked before deployment.
const tables = JSON.parse(schema.export()).tables;
const table = tables.find(item => item.tableName === "messages");
const common = ["chatId", "senderId", "clientMessageId", "status", "expiresAt", "createdAt", "updatedAt"];
function variant(type) {
  assert.equal(table.documentType.type, "union");
  const found = table.documentType.value.find(item => item.value.type.fieldType.value === type);
  assert.ok(found, `Missing ${type} variant`);
  return found.value;
}
function required(field, type) {
  assert.ok(field);
  assert.equal(field.optional, false);
  assert.equal(field.fieldType.type, type);
}

test("one messages table retains text/audio kinds and adds a payload-free tombstone", () => {
  assert.equal(tables.filter(item => item.tableName === "messages").length, 1);
  assert.equal(tables.some(item => item.tableName === "voiceMessages"), false);
  assert.equal(table.documentType.type, "union");
  const active = table.documentType.value.filter(item => !item.value.deletedAt);
  assert.deepEqual(active.map(item => item.value.type.fieldType.value).sort(), ["audio", "text"]);
  const deleted = table.documentType.value.find(item => item.value.deletedAt).value;
  required(deleted.deletedAt, "number");
  assert.deepEqual(deleted.type.fieldType.value.map(item => item.value).sort(), ["audio", "text"]);
  assert.deepEqual(Object.keys(deleted).sort(), [...common, "type", "deletedAt"].sort());
});

test("text messages require text and exclude audio payload fields", () => {
  const fields = variant("text");
  required(fields.type, "literal"); required(fields.text, "string");
  assert.equal(fields.audioStorageId, undefined);
  assert.equal(fields.audioDuration, undefined);
  assert.deepEqual(Object.keys(fields).sort(), [...common, "type", "text"].sort());
});

test("audio messages require a storage ID and duration and exclude text", () => {
  const fields = variant("audio");
  required(fields.type, "literal"); required(fields.audioStorageId, "id");
  assert.equal(fields.audioStorageId.fieldType.tableName, "_storage");
  required(fields.audioDuration, "number");
  assert.equal(fields.text, undefined);
  assert.deepEqual(Object.keys(fields).sort(), [...common, "type", "audioStorageId", "audioDuration"].sort());
});

test("both variants preserve ownership, timestamp, and receipt field types", () => {
  for (const type of ["text", "audio"]) {
    const fields = variant(type);
    required(fields.chatId, "id"); assert.equal(fields.chatId.fieldType.tableName, "chats");
    required(fields.senderId, "id"); assert.equal(fields.senderId.fieldType.tableName, "users");
    required(fields.createdAt, "number"); required(fields.updatedAt, "number");
    required(fields.status, "union");
    assert.deepEqual(fields.status.fieldType.value.map(item => item.value).sort(), ["delivered", "read", "sent"]);
  }
});

test("expiration remains optional on both message variants", () => {
  for (const type of ["text", "audio"]) {
    const field = variant(type).expiresAt;
    assert.equal(field.optional, true);
    assert.equal(field.fieldType.type, "number");
  }
});

test("message indexes retain chronological/expiration access and add bounded retry deduplication", () => {
  assert.deepEqual(table.indexes.map(index => [index.indexDescriptor, index.fields]), [
    ["by_chat", ["chatId"]],
    ["by_chat_created", ["chatId", "createdAt"]],
    ["by_chat_sender_created", ["chatId", "senderId", "createdAt"]],
    ["by_chat_sender_client", ["chatId", "senderId", "clientMessageId"]],
    ["by_audio_storage", ["audioStorageId"]],
    ["by_expires_at", ["expiresAt"]],
  ]);
});

test("the existing chat setting stays required and new direct chats default to disabled", async () => {
  const chatTable = tables.find(item => item.tableName === "chats");
  required(chatTable.documentType.value.disappearingMessages, "boolean");
  const f = pushFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  assert.equal(f.rows.chats.find(chat => chat._id === chatId).disappearingMessages, false);
  assert.equal(f.rows.messages.length, 0);
});
