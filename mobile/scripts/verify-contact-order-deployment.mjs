import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { contactSegments } from "../shared/contactOrder.js";

const cwd = fileURLToPath(new URL("../", import.meta.url)), envFile = resolve(cwd, ".env.local");
const env = parse(readFileSync(envFile));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "DEVELOPMENT_REQUIRED");
assert.equal(process.env.CONVEX_DEPLOY_KEY, undefined, "DEPLOY_KEY_OVERRIDE_NOT_ALLOWED");
const cli = resolve(cwd, "node_modules/convex/bin/main.js");
let stage = "startup";
function execute(args) {
  try {
    return JSON.parse(execFileSync(process.execPath, [cli, "run", ...args, "--env-file", envFile],
      { cwd, encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] }));
  } catch (error) {
    const diagnostic = String(error.stderr ?? "");
    const reason = diagnostic.includes("not found") ? "FUNCTION_NOT_FOUND"
      : diagnostic.includes("inline") ? "INLINE_QUERY" : diagnostic.includes("TypeError") ? "TYPE_ERROR" : "CLI_ERROR";
    throw Error(`DEVELOPMENT_QUERY_FAILED:${reason}`);
  }
}
async function main() {
  stage = "caller";
  const caller = execute(["--inline-query", "(await ctx.db.query('users').withIndex('by_active_directory_order', q => q.eq('isActive', true)).take(1)).map(u => ({ id: u._id, subject: u.clerkId }))[0]"]);
  assert.ok(caller, "ACTIVE_DEVELOPMENT_PROFILE_REQUIRED");
  const id = JSON.stringify(caller.id);
  stage = "expected";
  const expected = execute(["--inline-query", `return ({ users: (await ctx.db.query('users').take(101)).map(u => ({ id: u._id, active: u.isActive })),
    forward: (await ctx.db.query('friendships').withIndex('by_user1', q => q.eq('user1Id', ${id})).take(101)).map(f => f.user2Id),
    reverse: (await ctx.db.query('friendships').withIndex('by_user2', q => q.eq('user2Id', ${id})).take(101)).map(f => f.user1Id),
    blocked: (await ctx.db.query('blockedUsers').withIndex('by_blocker', q => q.eq('blockerId', ${id})).take(101)).map(b => b.blockedId),
    blockedBy: (await ctx.db.query('blockedUsers').withIndex('by_blocked', q => q.eq('blockedId', ${id})).take(101)).map(b => b.blockerId) })`]);
  assert.ok(Object.values(expected).every(rows => rows.length <= 100), "SMOKE_DATASET_LIMIT");
  const blocked = new Set([...expected.blocked, ...expected.blockedBy]);
  const eligible = expected.users.filter(user => user.active && user.id !== caller.id && !blocked.has(user.id)).map(user => user.id);
  const friendIds = new Set([...expected.forward, ...expected.reverse].filter(value => eligible.includes(value)));
  const seed = "12345678-1234-4321-8123-123456789abc";
  const anonymous = new ConvexHttpClient(env.EXPO_PUBLIC_CONVEX_URL, { logger: false });
  stage = "anonymous";
  await assert.rejects(anonymous.query(makeFunctionReference("contacts:listOrderedSegment"), {
    seed, source: "others", wrap: false, paginationOpts: { numItems: 20, cursor: null },
  }), /UNAUTHENTICATED/);
  const identity = JSON.stringify({ subject: caller.subject });
  const collect = () => {
    const found = new Map();
    for (const segment of contactSegments(seed, caller.id)) {
      stage = `segment:${segment.source}:${segment.wrap}`;
      let cursor = null, done = false;
      for (let batch = 0; batch < 100; batch++) {
        const result = execute(["contacts:listOrderedSegment", JSON.stringify({ seed, ...segment, paginationOpts: { numItems: 20, cursor } }), "--identity", identity]);
        assert.ok(typeof result.isDone === "boolean" && typeof result.continueCursor === "string", "NATIVE_PAGINATION_METADATA");
        for (const row of result.page) {
          assert.ok(Object.keys(row).every(key => ["_id", "fullName", "nickName", "imageUrl"].includes(key)), "PRIVATE_FIELD_EXPOSED");
          assert.ok(eligible.includes(row._id), "INELIGIBLE_CONTACT");
          if (!found.has(row._id)) found.set(row._id, row);
        }
        if (result.isDone) { done = true; break; }
        assert.ok(result.continueCursor !== cursor, "CURSOR_STALLED"); cursor = result.continueCursor;
      }
      assert.ok(done, "SMOKE_PAGE_LIMIT");
    }
    const ids = [...found.keys()];
    assert.ok(ids.length === eligible.length && eligible.every(value => found.has(value)), "DIRECTORY_INCOMPLETE");
    assert.ok(ids.slice(0, friendIds.size).every(value => friendIds.has(value)), "FRIENDS_NOT_FIRST");
    return ids;
  };
  const first = collect(), second = collect();
  assert.ok(JSON.stringify(first) === JSON.stringify(second), "ORDER_CHANGED_FOR_SAME_LAUNCH");
  console.log(JSON.stringify({ verifiedVisibleContacts: first.length, verifiedFriends: friendIds.size, sameSeedStable: true, anonymousRejected: true }));
  console.log("PASS: native development indexes/cursors and friends-first traversal verified with a read-only admin test identity. No user relationships or profiles changed.");
}
main().catch(error => {
  const reason = /^[A-Z_:]+$/.test(error.message) ? error.message : "ASSERTION_FAILED";
  console.error(`CONTACT_ORDER_DEPLOYMENT_SMOKE_FAILED stage=${stage} reason=${reason}`); process.exitCode = 1;
});
