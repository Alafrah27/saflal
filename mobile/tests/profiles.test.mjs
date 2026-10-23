import test from "node:test";
import assert from "node:assert/strict";
import { get } from "../convex/profiles.js";
import { blockUser, unblockUser, getBlockedUsers } from "../convex/blockedUsers.js";
import { getOrCreateDirectChat, getChat } from "../convex/chats.js";
import { getSendPermission, sendText, sendAudio } from "../convex/messages.js";
import { reserve } from "../convex/calls.js";
import { sendFriendRequest } from "../convex/friendRequests.js";
import { applyClerkProfile, syncFromClerk, updateProfile } from "../convex/users.js";
import { begin } from "../convex/accountDeletion.js";
import { listUsers } from "../convex/contacts.js";
import { people } from "../convex/search.js";
import { primaryVerifiedEmail } from "../convex/lib/clerkProfile.js";
import { searchFixture } from "./fixtures/searchFixture.mjs";

const options = { numItems: 20, cursor: null };
const profile = (f, args = { userId: "b" }) => get._handler(f.ctx, args);
async function fixture() {
  const f = searchFixture();
  const patch = f.ctx.db.patch;
  f.ctx.db.patch = (tableOrId, idOrFields, fields) => fields === undefined
    ? patch("users", tableOrId, idOrFields) : patch(tableOrId, idOrFields, fields);
  Object.assign(f.rows.users[1], { verifiedEmail: "verified@example.com", bio: "A useful bio", imageUrl: "https://example.com/photo" });
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const { chatId } = await getOrCreateDirectChat._handler(f.ctx, { userId: "b" });
  return { ...f, chatId };
}

test("profile reads require an active caller and never accept owner identity or email arguments", async () => {
  assert.deepEqual(Object.keys(JSON.parse(get.exportArgs()).value).sort(), ["chatId", "userId"]);
  assert.deepEqual(Object.keys(JSON.parse(updateProfile.exportArgs()).value).sort(), ["bio", "fullName", "nickName", "showLastSeen", "showOnlineStatus"]);
  for (const [subject, error] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const f = searchFixture(subject); if (subject === "clerk_a") f.rows.users[0].isActive = false;
    await assert.rejects(profile(f), error); assert.deepEqual(f.writes, []);
  }
});

test("only friends receive verified email; nonfriends receive authorized basic profile/bio, never private metadata", async () => {
  const f = await fixture(); f.rows.users[1].notificationSettingsVersion = 50;
  const friend = await profile(f); assert.equal(friend.email, "verified@example.com"); assert.equal(friend.bio, "A useful bio");
  assert.equal(friend.clerkId, undefined); assert.equal(friend.notificationSettingsVersion, undefined);
  f.rows.friendships = []; const nonfriend = await profile(f); assert.equal(nonfriend.email, undefined); assert.equal(nonfriend.bio, "A useful bio");
  delete f.rows.users[1].verifiedEmail; assert.equal((await profile(f)).email, undefined);
});

test("chat-context profile reads require valid membership and the actual peer", async () => {
  const f = await fixture(); assert.equal((await profile(f, { userId: "b", chatId: f.chatId })).email, "verified@example.com");
  for (const args of [{ userId: "c", chatId: f.chatId }, { userId: "a" }, { userId: "b", chatId: "missing" }])
    await assert.rejects(profile(f, args), /PROFILE_UNAVAILABLE/);
  f.as("c"); await assert.rejects(profile(f, { userId: "b", chatId: f.chatId }), /PROFILE_UNAVAILABLE/);
});

test("both-direction blocking removes email/bio without exposing reverse decisions; own-block identity stays available", async () => {
  for (const [blockerId, blockedId] of [["a", "b"], ["b", "a"]]) {
    const f = await fixture(); f.rows.blockedUsers.push({ _id: "block", blockerId, blockedId });
    const view = await profile(f, { userId: "b", chatId: f.chatId });
    assert.deepEqual(Object.keys(view).sort(), ["_id", "fullName", "imageUrl"]);
    const contact = await profile(f); assert.equal(contact === null, blockerId === "b");
    if (contact) assert.equal(contact.email, undefined);
  }
});

test("missing/inactive profiles are unavailable and missing blocked targets can still be unblocked", async () => {
  const f = await fixture(); assert.equal(await profile(f, { userId: "missing" }), null);
  await blockUser._handler(f.ctx, { blockedId: "b" }); f.rows.users = f.rows.users.filter(u => u._id !== "b");
  assert.equal(await profile(f), null);
  const result = await getBlockedUsers._handler(f.ctx, { paginationOpts: options }); assert.equal(result.page[0].user, null);
  await unblockUser._handler(f.ctx, { blockedId: "b" }); assert.equal(f.rows.blockedUsers.length, 0);
});

test("email remains absent from discovery/search/chat projections while the friend-only profile provides it", async () => {
  const f = await fixture();
  const responses = [await listUsers._handler(f.ctx, { paginationOpts: options }),
    await people._handler(f.ctx, { query: "User", paginationOpts: options }),
    await getChat._handler(f.ctx, { chatId: f.chatId }),
    await getBlockedUsers._handler(f.ctx, { paginationOpts: options })];
  for (const response of responses) assert.ok(!JSON.stringify(response).includes("verified@example.com"));
  assert.equal((await profile(f)).email, "verified@example.com");
});

test("primary email extraction uses only the verified primary Clerk address", () => {
  const make = fields => ({ primary_email_address_id: "primary", email_addresses: [
    { id: "other", email_address: "other@example.com", verification: { status: "verified" } },
    { id: "primary", email_address: "primary@example.com", verification: { status: "verified" }, ...fields },
  ] });
  assert.equal(primaryVerifiedEmail(make({})), "primary@example.com");
  for (const user of [null, {}, make({ verification: { status: "unverified" } }), make({ email_address: "bad\n@example.com" }), { ...make({}), primary_email_address_id: "missing" }])
    assert.equal(primaryVerifiedEmail(user), null);
});

test("server sync saves/removes verified email, ignores client claims, and never revives a deleted profile", async () => {
  const previousFetch = globalThis.fetch, key = process.env.CLERK_SECRET_KEY;
  const f = await fixture(), ctx = { auth: f.ctx.auth, runMutation: (_, args) => applyClerkProfile._handler(f.ctx, args) };
  let data = { primary_email_address_id: "primary", email_addresses: [{ id: "primary", email_address: "own@example.com", verification: { status: "verified" } }] };
  try {
    process.env.CLERK_SECRET_KEY = "test-only-placeholder";
    globalThis.fetch = async url => { assert.equal(url, "https://api.clerk.com/v1/users/clerk_a"); return { ok: true, status: 200, json: async () => data }; };
    await syncFromClerk._handler(ctx, {}); assert.equal(f.rows.users[0].verifiedEmail, "own@example.com");
    data.email_addresses[0].verification.status = "unverified"; await syncFromClerk._handler(ctx, {}); assert.equal(f.rows.users[0].verifiedEmail, undefined);
    data = {}; await syncFromClerk._handler(ctx, {}); assert.equal(f.rows.users[0].verifiedEmail, undefined);
    delete process.env.CLERK_SECRET_KEY;
    f.ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a", email: "forged@example.com", emailVerified: true });
    await syncFromClerk._handler(ctx, {}); assert.equal(f.rows.users[0].verifiedEmail, undefined);
    assert.deepEqual(Object.keys(JSON.parse(syncFromClerk.exportArgs()).value), ["fallbackImageUrl"]);
    f.rows.users[0].isActive = false;
    await applyClerkProfile._handler(f.ctx, { clerkId: "clerk_a", verifiedEmail: "late@example.com", disabled: false });
    assert.equal(f.rows.users[0].verifiedEmail, undefined);
  } finally { globalThis.fetch = previousFetch; if (key === undefined) delete process.env.CLERK_SECRET_KEY; else process.env.CLERK_SECRET_KEY = key; }
});

test("account deletion and Clerk deactivation erase the optional email immediately", async () => {
  const f = await fixture(); f.rows.users[0].verifiedEmail = "private@example.com";
  await begin._handler(f.ctx, {}); assert.equal(f.rows.users[0].verifiedEmail, undefined);
  await applyClerkProfile._handler(f.ctx, { clerkId: "clerk_b", disabled: true });
  assert.equal(f.rows.users[1].verifiedEmail, undefined); assert.equal(f.rows.users[1].isActive, false);
});

test("blocking stops active calls, rejects text/audio/calls/requests, preserves history and respects reverse blocks after unblocking", async () => {
  const f = await fixture();
  await sendText._handler(f.ctx, { chatId: f.chatId, text: "Keep this history", clientMessageId: "profile-message-key-0001" });
  const callId = await f.ctx.db.insert("calls", { callerId: "a", receiverId: "b", status: "accepted", chatId: f.chatId, streamCallId: "stream", createdAt: Date.now() });
  await blockUser._handler(f.ctx, { blockedId: "b" });
  assert.equal(f.rows.calls.find(c => c._id === callId).status, "ended");
  assert.equal(await getSendPermission._handler(f.ctx, { chatId: f.chatId }), false);
  await assert.rejects(sendText._handler(f.ctx, { chatId: f.chatId, text: "Denied", clientMessageId: "profile-message-key-0002" }), /CHAT_UNAVAILABLE/);
  await assert.rejects(sendAudio._handler(f.ctx, { chatId: f.chatId, uploadId: "unused", clientMessageId: "profile-audio-key-00001" }), /CHAT_UNAVAILABLE/);
  await assert.rejects(reserve._handler(f.ctx, { chatId: f.chatId, requestId: "profile-call-key-00001" }), /UNAVAILABLE/);
  await assert.rejects(sendFriendRequest._handler(f.ctx, { receiverId: "b" }), /UNAVAILABLE/);
  assert.equal((await getChat._handler(f.ctx, { chatId: f.chatId })).lastMessage.text, "Keep this history");
  assert.equal(f.rows.friendships.length, 1);
  f.as("b"); await blockUser._handler(f.ctx, { blockedId: "a" }); f.as("a");
  await unblockUser._handler(f.ctx, { blockedId: "b" }); assert.equal(await getSendPermission._handler(f.ctx, { chatId: f.chatId }), false);
  f.as("b"); await unblockUser._handler(f.ctx, { blockedId: "a" }); f.as("a");
  assert.equal(await getSendPermission._handler(f.ctx, { chatId: f.chatId }), true);
  f.rows.friendships = []; assert.equal(await getSendPermission._handler(f.ctx, { chatId: f.chatId }), false);
});
