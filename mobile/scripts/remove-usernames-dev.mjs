import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Run only after exporting development data and deploying the temporary
// optional-field schema. The final schema can be published once this completes.
const mobileDir = fileURLToPath(new URL("../", import.meta.url));
const envFile = fileURLToPath(new URL("../.env.local", import.meta.url));
assert.match(readFileSync(envFile, "utf8"), /^CONVEX_DEPLOYMENT=dev:/m,
  "This migration is restricted to the configured development deployment.");
assert.equal(process.env.CONVEX_DEPLOY_KEY, undefined,
  "Do not override the development deployment with a deploy key.");
const cli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));
let cursor = null;
let removedCount = 0;
for (let batch = 0; batch < 500; batch++) {
  const output = execFileSync(process.execPath, [cli, "run", "migrations/removeUsernames:remove",
    JSON.stringify({ cursor }), "--env-file", envFile], {
    cwd: mobileDir, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
  });
  const result = JSON.parse(output);
  assert.equal(typeof result.isDone, "boolean");
  assert.ok(Number.isInteger(result.removedCount));
  removedCount += result.removedCount;
  if (result.isDone) {
    console.log(`Development migration complete: removed ${removedCount} legacy username field(s).`);
    process.exit(0);
  }
  assert.equal(typeof result.continueCursor, "string");
  cursor = result.continueCursor;
}
throw new Error("Migration batch limit reached; inspect progress before resuming.");
