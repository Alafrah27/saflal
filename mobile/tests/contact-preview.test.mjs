import test from "node:test";
import assert from "node:assert/strict";
import { getUser } from "../convex/contacts.js";
import { getOrCreateDirectChat } from "../convex/chats.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

const preview = ctx => getUser._handler(ctx, { userId: "b" });

test("contact profile previews require an active authenticated caller", async () => {
  for (const [subject, error] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const f = pushFixture(subject);
    if (subject === "clerk_a") f.rows.users[0].isActive = false;
    await assert.rejects(preview(f.ctx), error);
    assert.deepEqual(f.writes, []);
  }
});

test("preview returns only the current minimal profile and does not require friendship or write records", async () => {
  const f = pushFixture();
  Object.assign(f.rows.users[1], { imageUrl: "https://example.com/photo", bio: "Private", lastSeenAt: 123 });
  const before = structuredClone(f.rows);
  assert.deepEqual(await preview(f.ctx), { _id: "b", fullName: "User b", imageUrl: "https://example.com/photo" });
  assert.deepEqual(f.rows, before); assert.deepEqual(f.writes, []);
  delete f.rows.users[1].imageUrl;
  assert.deepEqual(await preview(f.ctx), { _id: "b", fullName: "User b" });
});

test("blocked profiles in either direction are unavailable without exposing private block state", async () => {
  for (const [blockerId, blockedId] of [["a", "b"], ["b", "a"]]) {
    const f = pushFixture(); f.rows.blockedUsers.push({ blockerId, blockedId });
    assert.equal(await preview(f.ctx), null);
    assert.deepEqual(f.writes, []);
  }
});

test("missing, inactive, and self profiles share an unavailable result", async () => {
  const f = pushFixture();
  f.rows.users[1].isActive = false;
  assert.equal(await preview(f.ctx), null);
  assert.equal(await getUser._handler(f.ctx, { userId: "missing" }), null);
  assert.equal(await getUser._handler(f.ctx, { userId: "a" }), null);
});

test("preview access does not bypass the accepted-friend rule for creating a conversation", async () => {
  const f = pushFixture();
  assert.ok(await preview(f.ctx));
  await assert.rejects(getOrCreateDirectChat._handler(f.ctx, { userId: "b" }), /USER_UNAVAILABLE/);
  assert.equal(f.rows.chats.length, 0); assert.equal(f.rows.chatMembers.length, 0);
});

test("preview arguments accept only a target Convex user ID and expose no identity or status fields", () => {
  const args = JSON.parse(getUser.exportArgs()).value;
  assert.deepEqual(Object.keys(args), ["userId"]);
  assert.equal(args.userId.fieldType.type, "id"); assert.equal(args.userId.fieldType.tableName, "users");
  const result = JSON.parse(getUser.exportReturns());
  const profile = result.value.find(item => item.type === "object");
  assert.deepEqual(Object.keys(profile.value).sort(), ["_id", "fullName", "imageUrl", "nickName"]);
});
