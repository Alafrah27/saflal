import test from "node:test";
import assert from "node:assert/strict";
import { registerDevice, unregisterDevice } from "../convex/devices.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

const args = { expoPushToken: "ExpoPushToken[valid_token]", installationId: "installation_00000001", platform: "android", language: "en" };
const register = (ctx, extra = {}) => registerDevice._handler(ctx, { ...args, ...extra });
const unregister = (ctx, extra = {}) => unregisterDevice._handler(ctx, { installationId: args.installationId, ...extra });

test("device registration requires an active Clerk-owned profile", async () => {
  for (const [subject, code] of [[null, /UNAUTHENTICATED/], ["missing", /PROFILE_REQUIRED/], ["clerk_a", /ACCOUNT_INACTIVE/]]) {
    const f = pushFixture(subject);
    if (subject === "clerk_a") f.rows.users[0].isActive = false;
    await assert.rejects(register(f.ctx), code);
    assert.deepEqual(f.writes, []);
  }
});

test("device tokens and installation IDs are validated before writing", async () => {
  const f = pushFixture();
  for (const installationId of ["short", "x".repeat(129), "has spaces 000000000", "../00000000000000"]) {
    await assert.rejects(register(f.ctx, { installationId }), /INVALID_INSTALLATION/);
  }
  for (const expoPushToken of ["", "not-a-token", "ExpoPushToken[]", "ExpoPushToken[has spaces]", `ExpoPushToken[${"a".repeat(201)}]`]) {
    await assert.rejects(register(f.ctx, { expoPushToken }), /INVALID_PUSH_TOKEN/);
  }
  assert.deepEqual(f.writes, []);
});

test("registration is caller-owned, retry-idempotent, and updates locale/platform", async () => {
  const f = pushFixture();
  const result = await register(f.ctx);
  assert.equal(result.registrationVersion, 1);
  assert.equal(f.rows.devices[0].userId, "a");
  f.writes.length = 0;
  assert.deepEqual(await register(f.ctx), result);
  assert.deepEqual(f.writes, []);
  await register(f.ctx, { language: "ar", platform: "ios" });
  assert.equal(f.rows.devices[0].language, "ar");
  assert.equal(f.rows.devices[0].platform, "ios");
  assert.equal(f.rows.devices.length, 1);
});

test("token rotation and account changes fence old deliveries and stale sign-outs", async () => {
  const f = pushFixture();
  const first = await register(f.ctx);
  const second = await register(f.ctx, { expoPushToken: "ExponentPushToken[rotated]" });
  assert.equal(second.deviceId, first.deviceId);
  assert.equal(second.registrationVersion, 2);
  await unregister(f.ctx, { registrationVersion: 1 });
  assert.equal(f.rows.devices[0].isActive, true);
  f.as("b");
  const third = await register(f.ctx, { expoPushToken: "ExponentPushToken[rotated]" });
  assert.equal(third.registrationVersion, 3);
  assert.equal(f.rows.devices[0].userId, "b");
  f.as("a");
  await unregister(f.ctx);
  assert.equal(f.rows.devices[0].isActive, true);
  f.as("b");
  await unregister(f.ctx, { registrationVersion: 3 });
  assert.equal(f.rows.devices[0].isActive, false);
  assert.equal((await register(f.ctx, { expoPushToken: "ExponentPushToken[rotated]" })).registrationVersion, 5);
});

test("merging a known token with a different installation retires the old row", async () => {
  const f = pushFixture();
  const tokenRow = await f.device("b", { expoPushToken: args.expoPushToken });
  const installRow = await f.device("a", { installationId: args.installationId, registrationVersion: 7 });
  const result = await register(f.ctx);
  assert.equal(result.deviceId, tokenRow);
  assert.equal(result.registrationVersion, 8);
  await unregister(f.ctx, { registrationVersion: 7 });
  assert.equal(f.rows.devices.find(row => row._id === tokenRow).isActive, true);
  const retired = f.rows.devices.find(row => row._id === installRow);
  assert.equal(retired.isActive, false);
  assert.equal(retired.installationId, undefined);
  assert.equal(f.rows.devices.filter(row => row.installationId === args.installationId).length, 1);
});

test("duplicate historical tokens or installations fail without arbitrary repair", async () => {
  for (const fields of [{ expoPushToken: args.expoPushToken }, { installationId: args.installationId }]) {
    const f = pushFixture();
    await f.device("a", fields); await f.device("b", fields); f.writes.length = 0;
    await assert.rejects(register(f.ctx), /DEVICE_DATA_CONFLICT/);
    assert.deepEqual(f.writes, []);
  }
});

test("twenty active devices is the limit, but an existing registration can rotate", async () => {
  const f = pushFixture();
  await register(f.ctx);
  for (let n = 0; n < 19; n++) await f.device("a");
  await assert.rejects(register(f.ctx, { installationId: "installation_new0000", expoPushToken: "ExpoPushToken[new]" }), /DEVICE_LIMIT_REACHED/);
  await register(f.ctx, { expoPushToken: "ExpoPushToken[rotated]" });
  assert.equal(f.rows.devices.length, 20);
});

test("sign-out is idempotent, authenticated, and available for inactive/deleted profiles", async () => {
  const f = pushFixture();
  await register(f.ctx);
  f.rows.users[0].isActive = false;
  await unregister(f.ctx);
  assert.equal(f.rows.devices[0].isActive, false);
  f.writes.length = 0;
  await unregister(f.ctx);
  assert.deepEqual(f.writes, []);
  f.rows.users = f.rows.users.filter(user => user._id !== "a");
  assert.deepEqual(await unregister(f.ctx), { isActive: false });
  f.as(null);
  await assert.rejects(unregister(f.ctx), /UNAUTHENTICATED/);
});

test("public device validators accept no caller ID or active status", () => {
  assert.deepEqual(Object.keys(JSON.parse(registerDevice.exportArgs()).value).sort(), ["expoPushToken", "installationId", "language", "platform"]);
  assert.deepEqual(Object.keys(JSON.parse(unregisterDevice.exportArgs()).value).sort(), ["installationId", "registrationVersion"]);
});

test("invalid registration versions cannot silently bypass sign-out fencing", async () => {
  const f = pushFixture(); await register(f.ctx);
  for (const registrationVersion of [-1, 0.5, NaN, Infinity]) {
    await assert.rejects(unregister(f.ctx, { registrationVersion }), /INVALID_REGISTRATION_VERSION/);
  }
  assert.equal(f.rows.devices[0].isActive, true);
});
