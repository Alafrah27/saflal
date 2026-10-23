import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { parse } from "dotenv";

const mobileDir = fileURLToPath(new URL("../", import.meta.url));
const envFile = resolve(mobileDir, ".env.local");
const env = parse(readFileSync(envFile));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "Use only the configured development deployment.");
assert.equal(process.env.CONVEX_DEPLOY_KEY, undefined);
const cli = resolve(mobileDir, "node_modules/convex/bin/main.js");
const currentUsers = JSON.parse(execFileSync(process.execPath, [cli, "run", "--inline-query",
  "await ctx.db.query('users').take(1001)", "--env-file", envFile], {
  cwd: mobileDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}));
assert.ok(currentUsers.length < 1001, "Verification dataset exceeds its bounded read limit.");
assert.ok(currentUsers.every(user => typeof user.fullName === "string" && !Object.hasOwn(user, "username")),
  "Development profiles must contain fullName and no legacy username.");

// Compare the backup without printing names, IDs, or profile contents.
if (process.argv[2]) {
  const backup = readFileSync(process.argv[2], "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const canonical = user => JSON.stringify(Object.fromEntries(Object.entries(user)
    .filter(([key]) => key !== "username").sort(([a], [b]) => a.localeCompare(b))));
  for (const original of backup) {
    const current = currentUsers.find(user => user._id === original._id);
    assert.ok(current && canonical(current) === canonical(original), "A backed-up profile changed beyond removal of username.");
  }
  console.log(`PASS: ${backup.length} backed-up profile(s) preserved, including IDs and metadata.`);
}

const anonymous = new ConvexHttpClient(env.EXPO_PUBLIC_CONVEX_URL, { logger: false });
const args = { paginationOpts: { numItems: 20, cursor: null } };
await assert.rejects(anonymous.query(makeFunctionReference("contacts:listUsers"), args), /UNAUTHENTICATED/);
console.log("PASS: deployed discovery rejects anonymous callers.");

const caller = currentUsers.find(user => user.isActive);
assert.ok(caller, "An active development profile is required for the admin-identity query check.");
const result = JSON.parse(execFileSync(process.execPath, [cli, "run", "contacts:listUsers", JSON.stringify(args),
  "--identity", JSON.stringify({ subject: caller.clerkId }), "--env-file", envFile], {
  cwd: mobileDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}));
for (const user of result.page) {
  assert.ok(user._id !== caller._id, "Discovery must exclude the caller.");
  assert.ok(currentUsers.some(profile => profile._id === user._id && profile.isActive));
  assert.ok(Object.keys(user).every(key => ["_id", "fullName", "imageUrl"].includes(key)),
    "Discovery exposed unexpected profile fields.");
}
assert.equal(typeof result.isDone, "boolean");
assert.equal(typeof result.continueCursor, "string");
console.log(`PASS: admin-issued test identity fetched ${result.page.length} visible user(s) with private fields excluded.`);
console.log("Real Clerk provider login and native screen behavior still require device verification.");
