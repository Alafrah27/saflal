import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getOrCreateDirectChat, getChat, markAsRead } from "../convex/chats.js";
import { listMessages } from "../convex/messages.js";
import { resolvePushEvent } from "../convex/lib/push.js";
import { historyFixture } from "./fixtures/historyFixture.mjs";

async function fixture() {
  const f = historyFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  return { ...f, chatId, add: async (type = "text", senderId = "b", createdAt = 100) => {
    const id = await f.ctx.db.insert("messages", { chatId, type, senderId, createdAt, updatedAt: createdAt, status: "sent",
      ...(type === "text" ? { text: "Latest text" } : { audioStorageId: "voice-file", audioDuration: 65 }) });
    await f.ctx.db.patch("chats", chatId, { lastMessageId: id, lastMessageAt: createdAt });
    return id;
  } };
}
const chat = f => getChat._handler(f.ctx, { chatId: f.chatId });

test("text and audio previews share unread counts and recipient-derived receipts", async () => {
  const f = await fixture();
  await f.add(); const audioId = await f.add("audio", "b", 101);
  let view = await chat(f);
  assert.equal(view.unreadCount, 2); assert.equal(view.lastMessage.type, "audio");
  assert.equal(view.lastMessage.audioDuration, 65); assert.equal(view.lastMessage.status, "sent");
  await markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: audioId });
  view = await chat(f); assert.equal(view.unreadCount, 0); assert.equal(view.lastMessage.status, "read");
  f.as("b");
  const page = await listMessages._handler(f.ctx, { chatId: f.chatId, paginationOpts: { numItems: 20, cursor: null } });
  assert.ok(page.page.every(message => message.status === "read"));
  assert.equal(await resolvePushEvent(f.ctx, { kind: "message", messageId: audioId }), null);
});

test("a read covers over fifty messages with one write, and a later same-millisecond send stays unread", async () => {
  const f = await fixture(); let latest;
  for (let i = 0; i < 120; i++) latest = await f.add(i % 2 ? "audio" : "text");
  assert.equal((await chat(f)).unreadCount, 100);
  const before = f.writes.length;
  await markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: latest });
  assert.equal(f.writes.length, before + 1);
  assert.equal((await chat(f)).unreadCount, 0);
  const next = await f.add("audio");
  assert.equal((await chat(f)).unreadCount, 1);
  assert.equal((await chat(f)).lastMessage.status, "sent");
  await markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: latest });
  assert.equal((await chat(f)).unreadCount, 1);
  assert.ok(await resolvePushEvent(f.ctx, { kind: "message", messageId: next }));
});

test("outgoing traffic cannot hide an incoming unread message, and foreign receipts fail closed", async () => {
  const f = await fixture(); const incoming = await f.add();
  for (let i = 0; i < 110; i++) await f.add("text", "a", 101 + i);
  assert.equal((await chat(f)).unreadCount, 1);
  const foreign = await f.ctx.db.insert("messages", { chatId: "another-chat", createdAt: 300, type: "text", senderId: "b", text: "private" });
  await assert.rejects(markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: foreign }), /MESSAGE_UNAVAILABLE/);
  f.as("c"); await assert.rejects(markAsRead._handler(f.ctx, { chatId: f.chatId, messageId: incoming }), /CHAT_UNAVAILABLE/);
});

test("receipts wait for a loaded message and focused foreground, retry safely and stop after blur", async () => {
  let focus, appState, removed = 0, calls = [], fail = false;
  const timers = [];
  const native = { AppState: { currentState: "background", addEventListener: (_, fn) => { appState = fn; return { remove: () => removed++ }; } } };
  const mocks = { react: { useCallback: fn => fn }, "react-native": native,
    "expo-router": { useFocusEffect: fn => { focus = fn; } },
    "convex/react": { useMutation: () => async args => { calls.push(args); if (fail) throw Error("offline"); } },
    "../convex/_generated/api": { api: { chats: { markAsRead: "read" } } } };
  const url = new URL("../hooks/useChatRead.js", import.meta.url), require = createRequire(url), module = { exports: {} };
  const code = ts.transpileModule(readFileSync(url, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "module", "exports", "setTimeout", "clearTimeout", code)(name => mocks[name] ?? require(name), module, module.exports,
    fn => { timers.push(fn); return timers.length; }, () => {});
  module.exports.default("chat", undefined); assert.equal(focus(), undefined); assert.deepEqual(calls, []);
  module.exports.default("chat", "seen-message"); const blur = focus(); assert.deepEqual(calls, []);
  native.AppState.currentState = "active"; appState("active"); await Promise.resolve();
  assert.deepEqual(calls, [{ chatId: "chat", messageId: "seen-message" }]);
  fail = true; appState("active"); await Promise.resolve(); await Promise.resolve(); assert.equal(timers.length, 1);
  blur(); timers[0](); appState("active"); await Promise.resolve();
  assert.equal(calls.length, 2); assert.equal(removed, 1);
});
