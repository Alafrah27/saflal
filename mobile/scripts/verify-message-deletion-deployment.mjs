import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

// Read-only smoke checks, apart from an anonymous mutation that must fail before
// any database access. Never invoke authenticated deletion on existing messages.
const cwd = fileURLToPath(new URL("../", import.meta.url));
const envFile = resolve(cwd, ".env.local"), env = parse(readFileSync(envFile));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "DEVELOPMENT_REQUIRED");
assert.ok(!env.CONVEX_DEPLOY_KEY && !process.env.CONVEX_DEPLOY_KEY, "DEPLOY_KEY_OVERRIDE_NOT_ALLOWED");
const deployment = env.CONVEX_DEPLOYMENT.slice(4);
assert.equal(new URL(env.EXPO_PUBLIC_CONVEX_URL).hostname, `${deployment}.convex.cloud`, "DEPLOYMENT_URL_MISMATCH");
let stage = "startup";
function execute(args) {
  try {
    return JSON.parse(execFileSync(process.execPath, [resolve(cwd, "node_modules/convex/bin/main.js"), "run", ...args, "--env-file", envFile],
      { cwd, encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] }));
  } catch { throw Error("DEVELOPMENT_QUERY_FAILED"); }
}
async function main() {
  stage = "fixture-read";
  const fixture = execute(["--inline-query", `return await (async () => {
    const message = (await ctx.db.query('messages').take(1))[0];
    if (!message) return null;
    const sender = await ctx.db.get('users', message.senderId);
    return { messageId: message._id, chatId: message.chatId, subject: sender?.isActive ? sender.clerkId : null };
  })()`]);
  assert.ok(fixture?.messageId, "EXISTING_DEVELOPMENT_MESSAGE_REQUIRED");
  stage = "anonymous-delete";
  const client = new ConvexHttpClient(env.EXPO_PUBLIC_CONVEX_URL, { logger: false });
  await assert.rejects(client.mutation(makeFunctionReference("messages:deleteForEveryone"), { messageId: fixture.messageId }), /UNAUTHENTICATED/);
  let inspected = 0;
  if (fixture.subject) {
    stage = "history-read";
    const args = JSON.stringify({ chatId: fixture.chatId, paginationOpts: { numItems: 20, cursor: null } });
    const identity = JSON.stringify({ subject: fixture.subject });
    const page = execute(["messages:listMessages", args, "--identity", identity]);
    assert.ok(page.page.length <= 20 && typeof page.continueCursor === "string", "PAGINATION_CONTRACT");
    for (const row of page.page) {
      assert.ok(!("audioStorageId" in row), "PRIVATE_STORAGE_REFERENCE_EXPOSED");
      if (row.deletedAt !== undefined) {
        assert.equal(row.type, "text"); assert.equal(row.text, "Message deleted.");
        assert.equal(row.audioDuration, undefined);
      }
    }
    inspected = page.page.length;
  }
  console.log(JSON.stringify({ developmentOnly: true, anonymousDeleteRejected: true, inspectedHistoryRows: inspected, existingDataChanged: false }));
}
main().catch(() => { console.error(`MESSAGE_DELETION_SMOKE_FAILED:${stage}`); process.exitCode = 1; });
