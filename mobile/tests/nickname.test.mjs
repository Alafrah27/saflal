import test from "node:test";
import assert from "node:assert/strict";
import { displayName } from "../shared/displayName.js";
import { updateProfile, applyClerkProfile } from "../convex/users.js";
import { listUsers, getUser } from "../convex/contacts.js";
import { getOrCreateDirectChat, getChat } from "../convex/chats.js";
import { getCall, history } from "../convex/calls.js";
import { get } from "../convex/profiles.js";
import { people } from "../convex/search.js";
import { begin } from "../convex/accountDeletion.js";
import { searchFixture } from "./fixtures/searchFixture.mjs";

const options = { numItems: 20, cursor: null };
function fixture(subject = "clerk_a") {
  const f = searchFixture(subject), patch = f.ctx.db.patch;
  f.ctx.db.patch = (table, id, fields) => fields === undefined ? patch("users", table, id) : patch(table, id, fields);
  return f;
}

test("nickname display prefers a nonblank nickname and preserves full-name/unavailable fallbacks", () => {
  assert.equal(displayName({ fullName: "Full Name", nickName: "  Nick  " }), "Nick");
  for (const nickName of [undefined, "", "  "]) assert.equal(displayName({ fullName: "Full Name", nickName }), "Full Name");
  assert.equal(displayName(null, "Unavailable"), "Unavailable");
});

test("profile updates are self-only, normalize nickname/bio and preserve canonical name and relationships", async () => {
  const f = fixture(), before = structuredClone(f.rows.users);
  await updateProfile._handler(f.ctx, { nickName: "  أبو عمر  ", bio: "  Hello\nمرحبا  " });
  assert.equal(f.rows.users[0].nickName, "أبو عمر"); assert.equal(f.rows.users[0].bio, "Hello\nمرحبا");
  for (const key of ["_id", "clerkId", "fullName", "createdAt"]) assert.equal(f.rows.users[0][key], before[0][key]);
  assert.deepEqual(f.rows.users.slice(1), before.slice(1));
  assert.ok(!Object.keys(JSON.parse(updateProfile.exportArgs()).value).includes("userId"));
  await updateProfile._handler(f.ctx, { nickName: "", bio: "" });
  assert.equal(f.rows.users[0].nickName, undefined); assert.equal(f.rows.users[0].bio, "");
  assert.equal(displayName(f.rows.users[0]), before[0].fullName);
});

test("nickname and bio enforce Unicode limits atomically and reject unauthenticated/inactive updates", async () => {
  const f = fixture();
  await updateProfile._handler(f.ctx, { nickName: "😀".repeat(50), bio: "😀".repeat(500) });
  for (const args of [{ nickName: "😀".repeat(51) }, { nickName: "one\ntwo" }, { nickName: "valid", bio: "x".repeat(501) }]) {
    const before = structuredClone(f.rows.users[0]);
    await assert.rejects(updateProfile._handler(f.ctx, args)); assert.deepEqual(f.rows.users[0], before);
  }
  f.as(null); await assert.rejects(updateProfile._handler(f.ctx, { nickName: "No" }), /UNAUTHENTICATED/);
  f.as("a"); f.rows.users[0].isActive = false;
  await assert.rejects(updateProfile._handler(f.ctx, { bio: "No" }), /ACCOUNT_INACTIVE/);
});

test("current nicknames flow through contacts, chat, call history, search results and authorized profiles", async () => {
  const f = fixture();
  f.rows.users[1].nickName = "Peer Alias"; f.rows.users[1].bio = "Peer bio";
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  const callId = await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", status: "ended", type: "audio", createdAt: 1, callerHistoryVisible: true, receiverHistoryVisible: true });
  const projections = [
    await getUser._handler(f.ctx, { userId: "b" }),
    (await listUsers._handler(f.ctx, { paginationOpts: options })).page.find(u => u._id === "b"),
    (await getChat._handler(f.ctx, { chatId })).peer,
    (await getCall._handler(f.ctx, { callId })).peer,
    (await history._handler(f.ctx, { direction: "outgoing", paginationOpts: options })).page[0].peer,
    (await people._handler(f.ctx, { query: "User b", paginationOpts: options })).page[0],
    await get._handler(f.ctx, { userId: "b", chatId }),
  ];
  for (const projection of projections) {
    assert.equal(projection.nickName, "Peer Alias"); assert.equal(projection.fullName, "User b");
    assert.equal(displayName(projection), "Peer Alias"); assert.equal(projection.clerkId, undefined);
  }
  f.as("b"); await updateProfile._handler(f.ctx, { nickName: "New Alias", bio: "Updated bio" });
  f.as("a"); assert.equal((await getChat._handler(f.ctx, { chatId })).peer.nickName, "New Alias");
  assert.equal((await get._handler(f.ctx, { userId: "b", chatId })).bio, "Updated bio");
});

test("Clerk photo/email synchronization preserves nickname and bio; deletion clears both", async () => {
  const f = fixture(); await updateProfile._handler(f.ctx, { nickName: "Local alias", bio: "Local bio" });
  await applyClerkProfile._handler(f.ctx, { clerkId: "clerk_a", disabled: false, imageUrl: "https://example.com/photo", verifiedEmail: "verified@example.com" });
  assert.equal(f.rows.users[0].nickName, "Local alias"); assert.equal(f.rows.users[0].bio, "Local bio");
  await begin._handler(f.ctx, {});
  assert.equal(f.rows.users[0].nickName, undefined); assert.equal(f.rows.users[0].bio, undefined);
  assert.equal(displayName(f.rows.users[0]), "Deleted user");
});
