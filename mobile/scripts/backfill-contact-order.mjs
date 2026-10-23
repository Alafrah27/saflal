import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse } from "dotenv";

const cwd = fileURLToPath(new URL("../", import.meta.url));
const envFile = resolve(cwd, ".env.local"), env = parse(readFileSync(envFile));
assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "DEVELOPMENT_DEPLOYMENT_REQUIRED");
assert.equal(process.env.CONVEX_DEPLOY_KEY, undefined, "DEPLOY_KEY_OVERRIDE_NOT_ALLOWED");
const cli = resolve(cwd, "node_modules/convex/bin/main.js");
function run(name, args) {
  const output = execFileSync(process.execPath, [cli, "run", name, JSON.stringify(args), "--env-file", envFile],
    { cwd, encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(output);
}
for (const table of ["users", "friendships"]) {
  for (const operation of ["backfill", "verify"]) {
    let cursor = null, scanned = 0, changed = 0, missing = 0, done = false;
    for (let batch = 0; batch < 10000; batch++) {
      const result = run(`migrations/contactOrder:${operation}`, { table, cursor });
      assert.ok(result.scanned <= 50, "BATCH_READ_LIMIT");
      scanned += result.scanned; changed += result.changed ?? 0; missing += result.missing ?? 0;
      if (result.isDone) { done = true; break; }
      assert.notEqual(result.continueCursor, cursor, "CURSOR_DID_NOT_ADVANCE"); cursor = result.continueCursor;
    }
    assert.ok(done, "BATCH_LIMIT_REACHED"); assert.equal(missing, 0, "ORDER_KEYS_INCOMPLETE");
    console.log(JSON.stringify({ operation, table, scanned, changed, missing }));
  }
}
console.log("PASS: development ordering keys backfilled and verified; only directoryOrderKey was added.");
