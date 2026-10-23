// Development-only integration checks with isolated, admin-issued identities.
// Temporarily deploys the internal fixture, cleans its records, then removes it.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { parse } from "dotenv";

const mobileDir = fileURLToPath(new URL("../", import.meta.url));
const envFile = resolve(mobileDir, ".env.local");
const env = parse(await readFile(envFile));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "Only a configured development deployment is allowed.");
assert.equal(process.env.CONVEX_DEPLOY_KEY, undefined, "Do not override deployment credentials.");
assert.equal(process.env.CONVEX_DEPLOYMENT, undefined, "Do not override the configured deployment.");
const cli = resolve(mobileDir, "node_modules/convex/bin/main.js");
const exec = promisify(execFile);
const cliRun = async args => {
  try {
    return (await exec(process.execPath, [cli, ...args], {
      cwd: mobileDir, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    })).stdout;
  } catch (error) {
    // CLI error output may contain arguments/identity data; expose only known codes.
    const known = /UNAUTHENTICATED|PROFILE_REQUIRED|ACCOUNT_INACTIVE|USER_UNAVAILABLE|CANNOT_CHAT_WITH_SELF|CHAT_UNAVAILABLE|PAGE_SIZE_MUST_BE_1_TO_100|ArgumentValidationError/;
    throw new Error(error.stderr?.match(known)?.[0] ?? "Development CLI operation failed; inspect the deployment privately.");
  }
};
const run = async (name, args, subject) => {
  const output = await cliRun([
    "run", name, JSON.stringify(args), "--env-file", envFile,
    ...(subject ? ["--identity", JSON.stringify({ subject })] : []),
  ]);
  return output.trim() ? JSON.parse(output) : undefined;
};
const deploy = () => cliRun(["dev", "--once", "--typecheck", "disable", "--env-file", envFile]);
const trackedTables = ["users", "chats", "chatMembers", "messages", "friendships", "friendRequests", "blockedUsers", "calls", "devices"];
const snapshot = async () => {
  const data = JSON.parse(await cliRun(["run", "--inline-query",
    `const tables = ${JSON.stringify(trackedTables)}; return Object.fromEntries(await Promise.all(tables.map(async table => [table, await ctx.db.query(table).take(1001)])));`,
    "--env-file", envFile]));
  assert.ok(Object.values(data).every(rows => rows.length < 1001), "Dataset exceeds bounded verification limits.");
  return data;
};
const canonical = data => Object.fromEntries(Object.entries(data).map(([table, rows]) => [table,
  rows.map(row => JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))))).sort(),
]));
const before = await snapshot();
assert.equal(before.chats.length, 0, "Existing chats need review before pair-key backfilling.");
assert.equal(before.chatMembers.length, 0, "Existing memberships need review before publishing.");
console.log("PASS: development chat tables remain empty before publishing.");
const backupDir = process.argv[2] ?? await mkdtemp(resolve(tmpdir(), "saflal-chat-live-"));
await writeFile(resolve(backupDir, "live-before.json"), JSON.stringify(before));
const stagedFile = resolve(mobileDir, "convex/chatVerificationFixture.js");
const fixtureSource = (await readFile(new URL("../tests/fixtures/chatVerificationFixture.mjs", import.meta.url), "utf8"))
  .replace('"../../convex/_generated/server.js"', '"./_generated/server.js"');
const runId = randomUUID().replaceAll("-", "");
await writeFile(resolve(backupDir, "fixture-run.json"), JSON.stringify({ runId }));
await writeFile(stagedFile, fixtureSource, { flag: "wx" });
let deployed = false, created = false, cleaned = false;
try {
  await deploy(); deployed = true;
  console.log("PASS: chat functions and temporary internal fixture deployed to development.");
  const { userIds: [a, b, c] } = await run("chatVerificationFixture:setup", { runId }); created = true;
  const subject = suffix => `saflal_chat_verification_${runId}_${suffix}`;
  const results = await Promise.all([
    run("chats:getOrCreateDirectChat", { userId: b }, subject("a")),
    run("chats:getOrCreateDirectChat", { userId: a }, subject("b")),
    run("chats:getOrCreateDirectChat", { userId: b }, subject("a")),
    run("chats:getOrCreateDirectChat", { userId: a }, subject("b")),
  ]);
  const chatId = results[0].chatId;
  assert.ok(results.every(result => result.chatId === chatId));
  const afterCreate = await snapshot();
  assert.equal(afterCreate.chats.length, 1); assert.equal(afterCreate.chatMembers.length, 2);
  assert.deepEqual(afterCreate.chatMembers.map(member => member.userId).sort(), [a, b].sort());
  assert.equal(afterCreate.chats[0].directPairKey, JSON.stringify([a, b].sort()));
  await run("chats:getOrCreateDirectChat", { userId: b }, subject("a"));
  assert.deepEqual(canonical(await snapshot()), canonical(afterCreate), "Sequential retry unexpectedly wrote data.");
  console.log("PASS: four concurrent calls from both participants created one chat/two memberships; retry made no writes.");

  const anonymous = new ConvexHttpClient(env.EXPO_PUBLIC_CONVEX_URL, { logger: false });
  for (const [kind, name, args] of [
    ["mutation", "chats:getOrCreateDirectChat", { userId: b }],
    ["query", "chats:getChat", { chatId }],
    ["query", "chats:getMyChats", { paginationOpts: { numItems: 1, cursor: null } }],
  ]) await assert.rejects(anonymous[kind](makeFunctionReference(name), args), /UNAUTHENTICATED/);
  await assert.rejects(run("chats:getMyChats", { paginationOpts: { numItems: 1, cursor: null } }, subject("missing")), /PROFILE_REQUIRED/);
  await assert.rejects(run("chats:getChat", { chatId }, subject("c")), /CHAT_UNAVAILABLE/);
  await assert.rejects(run("chats:getOrCreateDirectChat", { userId: c }, subject("a")), /USER_UNAVAILABLE/);
  await assert.rejects(run("chats:getOrCreateDirectChat", { userId: a }, subject("a")), /CANNOT_CHAT_WITH_SELF/);
  const view = await run("chats:getChat", { chatId }, subject("a"));
  assert.deepEqual(view.peer, { _id: b, fullName: "Chat verification fixture" });
  assert.deepEqual(Object.keys(view.membership).sort(), ["isArchived", "isMuted", "joinedAt"]);
  assert.ok(!Object.hasOwn(view, "directPairKey"));
  const page = await run("chats:getMyChats", { paginationOpts: { numItems: 1, cursor: null } }, subject("a"));
  assert.deepEqual(page.page, [view]); assert.equal(typeof page.continueCursor, "string"); assert.equal(typeof page.isDone, "boolean");
  const exhausted = await run("chats:getMyChats", { paginationOpts: { numItems: 1, cursor: page.continueCursor } }, subject("a"));
  assert.deepEqual(exhausted.page, []); assert.equal(exhausted.isDone, true);
  await assert.rejects(run("chats:getOrCreateDirectChat", { userId: chatId }, subject("a")), /ArgumentValidationError/);
  await assert.rejects(run("chats:getOrCreateDirectChat", { userId: b, callerId: a }, subject("a")), /ArgumentValidationError/);
  for (const numItems of [0, 101]) await assert.rejects(run("chats:getMyChats", { paginationOpts: { numItems, cursor: null } }, subject("a")), /PAGE_SIZE_MUST_BE_1_TO_100/);
  console.log("PASS: live authorization, private projection, real pagination cursors, ID/argument validators, and page boundaries.");

  for (const [suffix, target] of [["b", a], ["a", b]]) {
    await run("blockedUsers:blockUser", { blockedId: target }, subject(suffix));
    await assert.rejects(run("chats:getOrCreateDirectChat", { userId: b }, subject("a")), /USER_UNAVAILABLE/);
    assert.equal((await run("chats:getChat", { chatId }, subject("a"))).chatId, chatId);
    await run("blockedUsers:unblockUser", { blockedId: target }, subject(suffix));
  }
  await run("users:applyClerkProfile", { clerkId: subject("b"), disabled: true });
  await assert.rejects(run("chats:getOrCreateDirectChat", { userId: b }, subject("a")), /USER_UNAVAILABLE/);
  await assert.rejects(run("chats:getChat", { chatId }, subject("b")), /ACCOUNT_INACTIVE/);
  assert.equal((await run("chats:getChat", { chatId }, subject("a"))).chatId, chatId);
  console.log("PASS: both block directions prevent creation/reuse; history remains readable; inactive callers/recipients reject.");
} finally {
  try {
    if (created) {
      const removed = await run("chatVerificationFixture:cleanup", { runId }); cleaned = true;
      assert.deepEqual(removed, { removedUsers: 3, removedChats: 1 });
      assert.deepEqual(canonical(await snapshot()), canonical(before), "Existing development data changed.");
      console.log("PASS: all disposable fixtures removed; all nine pre-existing tables exactly preserved.");
    }
  } finally {
    if (!created || cleaned) {
      // Remove the deployed helper even if a later verification assertion fails.
      await unlink(stagedFile);
      if (deployed) { await deploy(); console.log("PASS: final development deployment excludes the temporary fixture functions."); }
    }
  }
}
console.log("Admin-issued test identities verify backend transactions, not real Clerk sign-in or device behavior.");
