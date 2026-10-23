// Server-only setup. Dry run by default; never logs credentials or issues tokens.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { StreamClient } from "@stream-io/node-sdk";
import { restrictedGrants, validStreamPolicy, STREAM_CALL_TYPE } from "../convex/lib/streamPolicy.js";

const dir = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const apply = args.includes("--apply");
let stage = "prepare";
async function cli(command, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [resolve(dir, "node_modules/convex/bin/main.js"), ...command], { cwd: dir, stdio: "pipe" });
    let output = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.resume(); // CLI diagnostics may contain credentials; never echo.
    child.on("error", () => reject(Error("Development environment CLI could not start")));
    child.on("close", code => code === 0 ? resolvePromise(output) : reject(Error("Development environment CLI failed")));
    child.stdin.end(input);
  });
}

async function main() {
  const envPath = resolve(dir, ".env.local");
  const source = await readFile(envPath, "utf8"), env = parse(source);
  assert.ok(env.CONVEX_DEPLOYMENT?.startsWith("dev:"), "Only development setup is supported");
  assert.ok(!process.env.CONVEX_DEPLOY_KEY && !process.env.CONVEX_DEPLOYMENT, "Deployment overrides are not allowed");
  const key = env.STREAM_API_KEY || env.EXPO_PUBLIC_GETSTREAM_API_KEY;
  const secret = env.STREAM_API_SECRET || env.EXPO_PUBLIC_GETSTREAM_SECRE_KEY;
  assert.ok(key && secret, "Local server credentials are required");
  const client = new StreamClient(key, secret, { timeout: 15000 });
  const { app } = await client.getApp();
  assert.equal(app.name?.toLowerCase(), "saflal", "This must be the dedicated Saflal Stream application");
  assert.equal(String(app.id), env.EXPO_PUBLIC_GETSTREAM_APP_ID, "Stream application ID mismatch");
  assert.ok(!app.disable_auth_checks && !app.disable_permissions_checks, "Stream authentication and permission checks must be enabled");
  const { call_types: before } = await client.video.listCallTypes();
  const providerName = env.EXPO_PUBLIC_STREAM_ANDROID_PUSH_PROVIDER || "saflal-android";
  const providers = await client.listPushProviders();
  let firebase;
  if (args.includes("--firebase")) {
    firebase = JSON.parse(await readFile(option("--firebase"), "utf8"));
    const android = JSON.parse(await readFile(resolve(dir, "google-services.json"), "utf8"));
    assert.equal(firebase.project_id, android.project_info.project_id, "Firebase project must match the Android application");
    assert.equal(firebase.type, "service_account");
    assert.ok(firebase.private_key && firebase.client_email, "Firebase service account is incomplete");
  }
  const site = env.EXPO_PUBLIC_CONVEX_SITE_URL || env.CONVEX_SITE_URL;
  assert.ok(site && new URL(site).hostname === new URL(env.EXPO_PUBLIC_CONVEX_URL).hostname.replace(/\.convex\.cloud$/, ".convex.site"), "Development webhook URL must match the configured Convex deployment");
  const webhook = `${site.replace(/\/$/, "")}/stream/webhook`;
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", development: true, existingCallTypes: Object.keys(before), createAudioType: !before[STREAM_CALL_TYPE], restrictClientRoles: true, configureWebhook: true, firebaseProjectMatches: !!firebase, existingProvider: !!providers.push_providers?.some(p => p.name === providerName) }));
  if (!apply) return;
  assert.ok(args.includes("--snapshot"), "A rollback snapshot directory is required");
  const snapshot = resolve(option("--snapshot"));
  await mkdir(snapshot, { recursive: true });
  // Configuration only: no user records, tokens, Firebase credentials, or API secrets.
  await writeFile(resolve(snapshot, "stream-settings-before.json"), JSON.stringify({ call_types: before, event_hooks: app.event_hooks, providerExisted: !!providers.push_providers?.some(p => p.name === providerName) }, null, 2), { flag: "wx" });
  stage = "convex-credentials";
  await cli(["env", "set"], `STREAM_API_KEY=${key}\nSTREAM_API_SECRET=${secret}\n`);
  console.log("PASS: development Convex server credentials configured without exposing values");
  // Remove the mobile-public secret name; retain a private local server setting.
  const renamed = source.replace(/^EXPO_PUBLIC_GETSTREAM_SECRE_KEY\s*=.*\r?\n?/gm, "");
  const privateSource = /^STREAM_API_SECRET\s*=/m.test(renamed) ? renamed : `${renamed.trimEnd()}\nSTREAM_API_SECRET=${secret}\n`;
  await writeFile(envPath, privateSource);
  // Stream validates resolution even when video is disabled on a new call type.
  const settings = { audio: { mic_default_on: true, default_device: "earpiece" }, video: { enabled: false, target_resolution: { width: 640, height: 480 } },
    screensharing: { enabled: false }, backstage: { enabled: false },
    limits: { max_participants: 2, max_participants_exclude_owner: false, max_participants_exclude_roles: [] },
    ring: { incoming_call_timeout_ms: 30000, auto_cancel_timeout_ms: 30000, missed_call_timeout_ms: 30000 } };
  const notification_settings = { enabled: true, call_ring: { enabled: true }, call_missed: { enabled: true } };
  const audio = { name: STREAM_CALL_TYPE, grants: restrictedGrants(STREAM_CALL_TYPE, before[STREAM_CALL_TYPE]?.grants), settings, notification_settings };
  stage = "audio-call-type";
  if (before[STREAM_CALL_TYPE]) await client.video.updateCallType(audio);
  else await client.video.createCallType(audio);
  for (const [name, config] of Object.entries(before)) {
    stage = `restrict-${name}`;
    if (name !== STREAM_CALL_TYPE) await client.video.updateCallType({ name, grants: restrictedGrants(name, config.grants) });
  }
  const existingHooks = app.event_hooks ?? [];
  const ownHook = existingHooks.find(hook => hook.webhook_url === webhook && hook.product === "video");
  const hook = { ...ownHook, hook_type: "webhook", enabled: true, product: "video", webhook_url: webhook,
    event_types: ["call.accepted", "call.rejected", "call.missed", "call.ended", "call.session_ended", "call.session_participant_joined"] };
  stage = "webhook";
  await client.updateApp({ event_hooks: [...existingHooks.filter(h => h !== ownHook), hook] });
  stage = "firebase-provider";
  if (firebase) await client.upsertPushProvider({ push_provider: { name: providerName, type: "firebase", firebase_credentials: JSON.stringify(firebase), description: "Saflal Android incoming audio calls" } });
  const { call_types: after } = await client.video.listCallTypes();
  assert.ok(validStreamPolicy(after), "Live permission verification failed");
  console.log(JSON.stringify({ verified: true, memberOnlyAudio: true, maxParticipants: 2, webhook: true, firebaseProviderUpdated: !!firebase }));
}
main().catch(error => {
  // HTTP errors may include request credentials. Report only a safe error class/code.
  console.error(JSON.stringify({ failed: true, stage, kind: error.name, status: error.statusCode, code: error.code, assertion: error.name === "AssertionError" ? error.message.split("\n")[0] : undefined }));
  process.exitCode = 1;
});
