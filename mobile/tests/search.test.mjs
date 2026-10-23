import test from "node:test";
import assert from "node:assert/strict";
import { people, chats } from "../convex/search.js";
import { searchInput } from "../convex/lib/searchPolicy.js";
import { getOrCreateDirectChat, deleteForMe } from "../convex/chats.js";
import { sendText, sendAudio } from "../convex/messages.js";
import { VOICE_STORAGE_TYPE } from "../convex/lib/voicePolicy.js";
import { searchFixture } from "./fixtures/searchFixture.mjs";

const page = { numItems: 20, cursor: null };
const run = (fn, f, query = "User", paginationOpts = page, field) => fn._handler(f.ctx, { query, paginationOpts, ...(field ? { field } : {}) });
async function conversation() {
  const f = searchFixture();
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  return { ...f, chatId };
}

test("both search endpoints require an active Clerk-owned profile and expose only search/pagination arguments", async () => {
  for (const endpoint of [people, chats]) {
    assert.deepEqual(Object.keys(JSON.parse(endpoint.exportArgs()).value).sort(), ["field", "paginationOpts", "query"]);
    for (const [subject, error] of [[null, /UNAUTHENTICATED/], ["unknown", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
      const f = searchFixture(subject); if (subject === "clerk_a") f.rows.users[0].isActive = false;
      await assert.rejects(run(endpoint, f), error); assert.deepEqual(f.searches, []); assert.deepEqual(f.writes, []);
    }
  }
});

test("empty input makes no index read; invalid query lengths/terms and unsafe pagination are rejected", async () => {
  for (const endpoint of [people, chats]) {
    const f = searchFixture();
    assert.deepEqual(await run(endpoint, f, " \n "), { page: [], isDone: true, continueCursor: "" });
    assert.equal(f.searches.length, 0);
    for (const input of ["a".repeat(81), "a".repeat(33), Array(17).fill("a").join(" "), "!!!"])
      await assert.rejects(run(endpoint, f, input), /INVALID_SEARCH_QUERY/);
    for (const count of [0, 51, 1.2]) await assert.rejects(run(endpoint, f, "User", { ...page, numItems: count }), /PAGE_SIZE/);
    for (const maximumRowsRead of [0, -1, 1.5]) await assert.rejects(run(endpoint, f, "User", { ...page, maximumRowsRead }), /PAGINATION_LIMIT/);
    await run(endpoint, f, "User", { ...page, maximumRowsRead: 1000 }); assert.ok(f.reads.every(r => r.limit <= 50));
  }
  assert.deepEqual(searchInput("  محمد   علي "), { query: "محمد علي", valid: true });
});

test("People excludes self, inactive accounts and blocks in both directions without leaking private profile fields", async () => {
  const f = searchFixture();
  f.rows.users[1].imageUrl = "https://example.com/photo"; f.rows.users[1].bio = "private";
  assert.deepEqual((await run(people, f)).page.map(u => u._id).sort(), ["b", "c"]);
  assert.deepEqual(Object.keys((await run(people, f)).page.find(u => u._id === "b")).sort(), ["_id", "fullName", "imageUrl"]);
  for (const [blockerId, blockedId] of [["a", "b"], ["b", "a"]]) {
    f.rows.blockedUsers = [{ _id: "block", blockerId, blockedId }];
    assert.deepEqual((await run(people, f)).page.map(u => u._id), ["c"]);
  }
  f.rows.users[2].isActive = false;
  assert.deepEqual((await run(people, f)).page, []);
  assert.deepEqual(f.searches[0].filters, [["isActive", true]]); assert.deepEqual(f.writes, []);
});

test("name search passes trimmed English/Arabic prefixes to the native index and retains candidate relevance/duplicate names", async () => {
  const f = searchFixture();
  f.rows.users[1].fullName = "Sarah Noor"; f.rows.users[2].fullName = "Sarah Noor";
  f.rankedIds = ["b", "c", "a"];
  assert.deepEqual((await run(people, f, "  sAr ")).page.map(u => u._id), ["b", "c"]);
  assert.equal(f.searches.at(-1).text, "sAr");
  f.rows.users[1].fullName = "محمد علي";
  assert.deepEqual((await run(people, f, "محمد ع")).page.map(u => u._id), ["b"]);
  f.rows.users[1].fullName = "Renamed Person";
  assert.equal((await run(people, f, "محمد ع")).page.length, 0);
});

test("people and chats can search English/Arabic nicknames while full-name lookup remains available", async () => {
  const f = await conversation();
  f.rows.users[1].fullName = "Canonical Person";
  for (const [nickname, prefix] of [["Star Friend", "sTa"], ["صديق مميز", "صدي"]]) {
    f.rows.users[1].nickName = nickname;
    for (const endpoint of [people, chats]) {
      const result = await run(endpoint, f, prefix, page, "nickName");
      assert.equal(result.page.length, 1);
      assert.equal(endpoint === people ? result.page[0]._id : result.page[0].peer._id, "b");
      assert.equal(f.searches.at(-1).name, "search_nickName");
      assert.equal((await run(endpoint, f, "Canonical")).page.length, 1);
    }
  }
  delete f.rows.users[1].nickName;
  assert.equal((await run(people, f, "صدي", page, "nickName")).page.length, 0);
  assert.equal((await run(chats, f, "Canonical")).page.length, 1);
});

test("nickname lookup retains active-account/block/membership privacy and bounded pagination", async () => {
  const f = await conversation(); f.rows.users[1].nickName = "Shared Nick";
  f.rows.users[2].nickName = "Shared Nick";
  const first = await run(people, f, "Shared", { numItems: 1, cursor: null }, "nickName");
  const second = await run(people, f, "Shared", { numItems: 1, cursor: first.continueCursor }, "nickName");
  assert.equal(first.isDone, false); assert.equal(second.isDone, true);
  assert.equal(new Set([...first.page, ...second.page].map(user => user._id)).size, 2);
  f.rows.blockedUsers.push({ blockerId: "b", blockedId: "a" });
  assert.equal((await run(people, f, "Shared", page, "nickName")).page.some(user => user._id === "b"), false);
  assert.equal((await run(chats, f, "Shared", page, "nickName")).page[0].chatId, f.chatId);
  f.as("c"); assert.deepEqual((await run(chats, f, "Shared", page, "nickName")).page, []);
  f.as(null); await assert.rejects(run(people, f, "Shared", page, "nickName"), /UNAUTHENTICATED/);
  assert.ok(f.reads.every(read => read.limit <= 100));
});

test("bounded People pagination finds results beyond page one and preserves sparse continuation metadata", async () => {
  const f = searchFixture(); f.rows.users = [f.rows.users[0]];
  for (let i = 0; i < 45; i++) f.rows.users.push({ _id: `user${i}`, fullName: "Same Name", isActive: true });
  f.rankedIds = f.rows.users.slice(1).map(u => u._id);
  f.rows.blockedUsers = f.rankedIds.slice(0, 20).map(blockedId => ({ blockerId: "a", blockedId }));
  const first = await run(people, f, "Same");
  assert.equal(first.page.length, 0); assert.equal(first.isDone, false); assert.equal(first.continueCursor, "20");
  assert.equal(first.splitCursor, "search-split");
  const second = await run(people, f, "Same", { ...page, cursor: first.continueCursor });
  const third = await run(people, f, "Same", { ...page, cursor: second.continueCursor });
  assert.equal(second.page.length, 20); assert.equal(third.page.length, 5); assert.equal(third.isDone, true);
  assert.equal(new Set([...second.page, ...third.page].map(u => u._id)).size, 25);
});

test("chat name search validates membership and never creates chats or writes during discovery", async () => {
  const f = await conversation(), before = structuredClone(f.rows), writes = f.writes.length;
  const found = await run(chats, f);
  assert.deepEqual(found.page.map(c => c.chatId), [f.chatId]); assert.equal(f.writes.length, writes); assert.deepEqual(f.rows, before);
  f.as("c"); assert.deepEqual((await run(chats, f)).page, []); f.as("a");
  f.rows.chatMembers = f.rows.chatMembers.filter(m => m.userId !== "a");
  assert.deepEqual((await run(chats, f)).page, []);
});

test("personally hidden chats stay absent; People reopening retains empty cleared previews; new text restores search", async () => {
  const f = await conversation(); f.as("b");
  await sendText._handler(f.ctx, { chatId: f.chatId, text: "Old private text", clientMessageId: "old-message-key-0001" }); f.as("a");
  await deleteForMe._handler(f.ctx, { chatIds: [f.chatId] });
  assert.deepEqual((await run(chats, f)).page, []); assert.ok((await run(people, f)).page.some(u => u._id === "b"));
  f.as("b"); assert.equal((await run(chats, f)).page[0].lastMessage.text, "Old private text"); f.as("a");
  await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  const reopened = (await run(chats, f)).page[0]; assert.equal(reopened.lastMessage, undefined); assert.equal(reopened.unreadCount, 0);
  await deleteForMe._handler(f.ctx, { chatIds: [f.chatId] }); f.as("b");
  await sendText._handler(f.ctx, { chatId: f.chatId, text: "New text", clientMessageId: "new-message-key-0001" }); f.as("a");
  assert.equal((await run(chats, f)).page[0].lastMessage.text, "New text");
});

test("new voice messages restore searchable chats and expired previews remain excluded", async () => {
  const f = await conversation(); await deleteForMe._handler(f.ctx, { chatIds: [f.chatId] });
  const key = "new-audio-message-0001";
  const uploadId = await f.ctx.db.insert("audioUploads", { chatId: f.chatId, ownerId: "a", clientMessageId: key,
    status: "ready", storageId: "audio", audioDuration: 2, expiresAt: Date.now() + 60000 });
  f.ctx.db.system = { get: async () => ({ size: 1024, contentType: VOICE_STORAGE_TYPE }) };
  await sendAudio._handler(f.ctx, { chatId: f.chatId, uploadId, clientMessageId: key });
  assert.equal((await run(chats, f)).page[0].lastMessage.type, "audio");
  f.rows.messages[0].expiresAt = Date.now() - 1;
  assert.equal((await run(chats, f)).page[0].lastMessage, undefined);
});

test("historical chat access survives blocking/inactive peers while People remains privacy filtered", async () => {
  const f = await conversation();
  f.rows.blockedUsers.push({ blockerId: "b", blockedId: "a" }); f.rows.users[1].isActive = false;
  assert.equal((await run(chats, f)).page[0].chatId, f.chatId);
  assert.equal((await run(people, f)).page.some(u => u._id === "b"), false);
  assert.deepEqual(f.searches.find(s => s.filters.length === 0).filters, []);
});

test("chat candidate pagination retains sparse pages and skips duplicate/malformed direct conversations", async () => {
  const f = await conversation(); f.rankedIds = ["c", "b"];
  const first = await run(chats, f, "User", { numItems: 1, cursor: null });
  assert.equal(first.page.length, 0); assert.equal(first.isDone, false);
  assert.equal((await run(chats, f, "User", { numItems: 1, cursor: first.continueCursor })).page[0].chatId, f.chatId);
  f.rows.chats.push({ ...f.rows.chats[0], _id: "duplicate" });
  assert.deepEqual((await run(chats, f)).page, []);
});
