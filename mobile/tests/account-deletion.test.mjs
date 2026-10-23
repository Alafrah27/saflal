import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { getFunctionName } from "convex/server";
import { owner, begin, cleanup, claim, progress, recover } from "../convex/accountDeletion.js";
import { requireUser } from "../convex/auth.js";
import { completeProfile } from "../convex/users.js";
import { request as registeredRequest } from "../convex/accountDeletionActions.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

function fixture(subject) {
  const f = pushFixture(subject);
  f.deletedFiles = [];
  f.ctx.storage = { delete: async id => { f.deletedFiles.push(id); } };
  return f;
}
async function start(f) { await begin._handler(f.ctx, {}); return f.rows.accountDeletions[0]; }
async function cleanupAll(f, job) {
  for (let i = 0; !job.localDone && i < 100; i++) await cleanup._handler(f.ctx, { jobId: job._id });
  assert.equal(job.localDone, true);
}

test("deletion is self-only, requires a verified identity and explicit confirmation, and rejects unrelated inactive profiles", async () => {
  assert.deepEqual(Object.keys(JSON.parse(registeredRequest.exportArgs()).value), ["confirmation"]);
  const f = fixture(null); await assert.rejects(owner._handler(f.ctx, {}), /UNAUTHENTICATED/);
  await assert.rejects(begin._handler(f.ctx, {}), /UNAUTHENTICATED/);
  f.as("b"); f.rows.users[1].isActive = false;
  await assert.rejects(begin._handler(f.ctx, {}), /ACCOUNT_UNAVAILABLE/);
  assert.equal(f.rows.accountDeletions.length, 0);
});

test("confirmed deletion anonymizes only its owner, denies old tokens/onboarding and is idempotent", async () => {
  const f = fixture(); Object.assign(f.rows.users[0], { imageUrl: "https://private/photo", bio: "private", lastSeenAt: 42 });
  const job = await start(f), user = f.rows.users[0];
  assert.equal(user.isActive, false); assert.equal(user.fullName, "Deleted user");
  assert.equal(user.notificationsEnabled, false); assert.ok(user.deletedAt);
  for (const key of ["bio", "imageUrl", "lastSeenAt"]) assert.equal(user[key], undefined);
  assert.equal(f.rows.users[1].isActive, true); assert.equal(f.rows.users[1].fullName, "User b");
  await assert.rejects(requireUser(f.ctx), /ACCOUNT_INACTIVE/);
  await assert.rejects(completeProfile._handler(f.ctx, { fullName: "Restore" }), /ACCOUNT_INACTIVE/);
  await begin._handler(f.ctx, {}); assert.equal(f.rows.accountDeletions.length, 1);
  assert.equal(job.clerkId, "clerk_a"); assert.equal(f.scheduled.length, 2);
});

test("an active call on either side blocks account deletion without changing any profile", async () => {
  for (const side of ["caller", "receiver"]) {
    const f = fixture(); f.rows.calls.push({ _id: "live", _creationTime: 1, callerId: side === "caller" ? "a" : "b",
      receiverId: side === "receiver" ? "a" : "b", status: "accepted" });
    await assert.rejects(begin._handler(f.ctx, {}), /ACCOUNT_DELETE_ACTIVE_CALL/);
    assert.equal(f.rows.users[0].isActive, true); assert.equal(f.rows.accountDeletions.length, 0);
  }
});

test("bounded local cleanup removes personal relationships/tokens and preserves shared messages/calls/files", async () => {
  const f = fixture(); const messageId = await f.message();
  for (let i = 0; i < 60; i++) await f.device("a");
  await f.device("b");
  for (const [table, row] of [
    ["friendRequests", { senderId: "a", receiverId: "b" }], ["friendRequests", { senderId: "b", receiverId: "a" }],
    ["friendships", { user1Id: "a", user2Id: "b" }], ["friendships", { user1Id: "c", user2Id: "a" }],
    ["blockedUsers", { blockerId: "a", blockedId: "b" }], ["blockedUsers", { blockerId: "c", blockedId: "a" }],
    ["pushDeliveries", { actorId: "a", recipientId: "b" }], ["pushDeliveries", { actorId: "b", recipientId: "a" }],
    ["audioUploads", { ownerId: "a", storageId: "uncommitted" }], ["audioUploads", { ownerId: "a", storageId: "shared_audio" }],
    ["audioUploads", { ownerId: "b", storageId: "other_audio" }],
  ]) await f.ctx.db.insert(table, row);
  f.rows.messages[0].type = "audio"; f.rows.messages[0].audioStorageId = "shared_audio";
  f.rows.calls.push({ _id: "historic", callerId: "a", receiverId: "b", status: "ended" });
  const job = await start(f); await cleanup._handler(f.ctx, { jobId: job._id });
  assert.equal(f.rows.devices.filter(d => d.userId === "a").length, 35);
  await cleanupAll(f, job);
  assert.deepEqual(f.rows.devices.map(d => d.userId), ["b"]);
  for (const table of ["friendRequests", "friendships", "blockedUsers", "pushDeliveries"]) assert.equal(f.rows[table].length, 0);
  assert.deepEqual(f.deletedFiles, ["uncommitted"]);
  assert.deepEqual(f.rows.audioUploads.map(u => u.ownerId), ["b"]);
  assert.equal(f.rows.messages[0]._id, messageId); assert.equal(f.rows.calls[0]._id, "historic");
  assert.equal(f.rows.chatMembers.length, 2);
});

test("deletion workers use expiring leases, reject stale responses and complete only after every cleanup", async () => {
  const f = fixture(), job = await start(f);
  assert.ok(await claim._handler(f.ctx, { jobId: job._id, lease: "first" }));
  assert.equal(await claim._handler(f.ctx, { jobId: job._id, lease: "duplicate" }), null);
  await progress._handler(f.ctx, { jobId: job._id, lease: "stale", clerkDone: true }); assert.equal(job.clerkDone, false);
  job.leaseUntil = 1;
  assert.ok(await claim._handler(f.ctx, { jobId: job._id, lease: "next" }));
  await progress._handler(f.ctx, { jobId: job._id, lease: "next", clerkDone: true, streamDone: true, release: true });
  assert.equal(job.status, "pending"); await cleanupAll(f, job);
  assert.equal(job.status, "complete"); assert.equal(job.clerkId, undefined); assert.equal(job.dueAt, undefined);
  assert.equal(job.streamDone, true); assert.equal(job.clerkDone, true);
});

test("service failures back off and the cron recovers expired jobs in bounded batches", async () => {
  const f = fixture(), job = await start(f);
  for (let i = 0; i < 12; i++) {
    job.leaseUntil = 0; await claim._handler(f.ctx, { jobId: job._id, lease: "work" });
    await progress._handler(f.ctx, { jobId: job._id, lease: "work", release: true, failed: true });
    assert.ok(f.scheduled.at(-1).delay <= 3_600_000); assert.equal(job.lease, undefined);
  }
  const query = f.ctx.db.query;
  f.ctx.db.query = table => table !== "accountDeletions" ? query(table) : {
    withIndex(name, build) {
      assert.equal(name, "by_due"); let lower, upper;
      const q = { gt(field, value) { assert.equal(field, "dueAt"); lower = value; return q; },
        lte(field, value) { assert.equal(field, "dueAt"); upper = value; return q; } };
      build(q); return { take: async size => { assert.equal(size, 10); return f.rows.accountDeletions.filter(j => j.dueAt > lower && j.dueAt <= upper).slice(0, size); } };
    },
  };
  job.dueAt = 1; job.leaseUntil = 1;
  const count = f.scheduled.length; await recover._handler(f.ctx, {});
  assert.equal(f.scheduled.length, count + 2); assert.ok(job.dueAt > Date.now());
});

function actionFixture({ configured = true, userPresent = true, requested = false } = {}) {
  const calls = [], changes = [];
  const job = { _id: "job", userId: "a", clerkId: "clerk_a", clerkDone: false, streamDone: false };
  const client = {
    queryUsers: async args => { calls.push(["query", args]); return { users: userPresent ? [{ id: "a" }] : [] }; },
    deactivateUser: async args => { calls.push(["deactivate", args]); },
    deleteUsers: async args => { calls.push(["delete", args]); return { task_id: "task" }; },
    getTask: async () => ({ status: "completed" }),
  };
  const file = new URL("../convex/accountDeletionActions.js", import.meta.url), require = createRequire(file), module = { exports: {} };
  const mocks = { "@stream-io/node-sdk": { StreamClient: class { constructor() { return client; } } },
    "./_generated/server.js": { action: x => x, internalAction: x => x } };
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const state = { status: 200, failure: false, claim: true };
  const fetch = async (url, options) => { calls.push([options.method, url]); if (state.failure) throw Error("PRIVATE_REQUEST_DATA");
    return { ok: state.status >= 200 && state.status < 300, status: state.status }; };
  new Function("require", "module", "exports", "process", "fetch", compiled.outputText)(
    name => mocks[name] ?? require(name), module, module.exports,
    { env: configured ? { CLERK_SECRET_KEY: "test-clerk", STREAM_API_KEY: "test-stream", STREAM_API_SECRET: "test-secret" } : {} }, fetch);
  const ctx = { runQuery: async () => ({ userId: "a", clerkId: "clerk_a", requested }),
    runMutation: async (reference, args) => {
      const name = getFunctionName(reference); changes.push([name, args]);
      if (name === "accountDeletion:claim") return state.claim ? job : null;
      if (name === "accountDeletion:begin") return { accepted: true };
    } };
  return { functions: module.exports, ctx, client, calls, changes, job, state };
}

test("missing/invalid provider configuration fails before disabling an account; retrying an accepted request is safe", async () => {
  for (const mode of ["missing", "clerk404", "clerk503", "streamFailure"]) {
    const f = actionFixture({ configured: mode !== "missing" });
    if (mode === "clerk404") f.state.status = 404;
    if (mode === "clerk503") f.state.status = 503;
    if (mode === "streamFailure") f.client.queryUsers = async () => { throw Error("PRIVATE"); };
    await assert.rejects(f.functions.request.handler(f.ctx, { confirmation: "DELETE" }), /ACCOUNT_DELETE_UNAVAILABLE/);
    assert.equal(f.changes.length, 0);
  }
  const f = actionFixture({ requested: true, configured: false });
  assert.deepEqual(await f.functions.request.handler(f.ctx, { confirmation: "DELETE" }), { accepted: true });
  assert.equal(f.calls.length, 0);
});

test("successful preflight requests only the verified account and begins the durable job", async () => {
  const f = actionFixture(); await f.functions.request.handler(f.ctx, { confirmation: "DELETE" });
  assert.deepEqual(f.calls[0], ["GET", "https://api.clerk.com/v1/users/clerk_a"]);
  assert.deepEqual(f.changes[0], ["accountDeletion:begin", {}]);
});

test("service cleanup deletes Clerk and prunes/deactivates only its Stream user, polling the async task", async () => {
  const f = actionFixture(); await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.ok(f.calls.some(c => c[0] === "DELETE" && c[1].endsWith("/clerk_a")));
  assert.deepEqual(f.calls.find(c => c[0] === "deactivate")[1], { user_id: "a" });
  assert.deepEqual(f.calls.find(c => c[0] === "delete")[1], { user_ids: ["a"], user: "pruning" });
  assert.ok(f.changes.some(([, args]) => args.streamTaskId === "task"));
  f.job.streamTaskId = "task"; f.job.clerkDone = true; f.changes.length = 0; f.calls.length = 0;
  await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.equal(f.calls.length, 0); assert.ok(f.changes.some(([, args]) => args.streamDone));
});

test("Clerk outages do not stop Stream cleanup; missing users, failed tasks and duplicate workers retry safely", async () => {
  const f = actionFixture({ userPresent: false }); f.state.status = 503;
  await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.ok(f.changes.some(([, a]) => a.streamDone)); assert.equal(f.changes.at(-1)[1].failed, true);
  f.job.streamTaskId = "task"; f.state.status = 404;
  f.client.getTask = async () => ({ status: "failed", error: { message: "PRIVATE" } });
  f.changes.length = 0; await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.ok(f.changes.some(([, a]) => a.clerkDone));
  assert.ok(f.changes.some(([, a]) => a.streamTaskId === null));
  f.state.claim = false; f.calls.length = 0;
  await f.functions.run.handler(f.ctx, { jobId: "job" }); assert.equal(f.calls.length, 0);
});

test("previously deactivated users are still pruned after retry; missing task IDs can be resubmitted", async () => {
  const f = actionFixture();
  f.client.queryUsers = async args => {
    assert.equal(args.payload.include_deactivated_users, true);
    return { users: [{ id: "a", deactivated_at: new Date() }] };
  };
  await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.ok(!f.calls.some(c => c[0] === "deactivate"));
  assert.ok(f.calls.some(c => c[0] === "delete"));
  f.job.streamTaskId = "expired"; f.client.getTask = async () => { throw { statusCode: 404 }; };
  f.changes.length = 0; await f.functions.run.handler(f.ctx, { jobId: "job" });
  assert.ok(f.changes.some(([, a]) => a.streamTaskId === null));
  assert.equal(f.changes.at(-1)[1].failed, true);
});
