import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { getFunctionName } from "convex/server";
import { setNotifications, notificationPreference, notificationSyncResult } from "../convex/users.js";
import { enqueueFriendPush, enqueueMessagePush, deliveryPayload } from "../convex/lib/push.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";
import { changeAppLanguage } from "../lib/changeAppLanguage.js";

function execute(file, mocks, globals = {}) {
  const url = new URL(file, import.meta.url), require = createRequire(url), module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(url, "utf8"), { fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  new Function("require", "module", "exports", "process", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports, globals.process ?? process);
  return module.exports;
}

test("notification preference accepts only enabled and derives its owner from Clerk", async () => {
  assert.deepEqual(Object.keys(JSON.parse(setNotifications.exportArgs()).value), ["enabled"]);
  const f = pushFixture();
  await setNotifications._handler(f.ctx, { enabled: false });
  const user = f.rows.users[0];
  assert.equal(user.notificationsEnabled, false); assert.equal(user.notificationSyncStatus, "pending");
  assert.equal(user.notificationSettingsVersion, 1);
  assert.ok(f.rows.users.slice(1).every(u => u.notificationsEnabled === undefined));
  assert.deepEqual(f.scheduled[0].args, { userId: "a", version: 1, attempt: 0 });
  assert.equal(getFunctionName(f.scheduled[0].fn), "streamCalls:syncNotificationPreference");
  const count = f.scheduled.length;
  await setNotifications._handler(f.ctx, { enabled: false }); assert.equal(f.scheduled.length, count);
  await assert.rejects(setNotifications._handler(f.ctx, { enabled: true }), /NOTIFICATION_UPDATE_PENDING/);
  f.as(null); await assert.rejects(setNotifications._handler(f.ctx, { enabled: true }), /UNAUTHENTICATED/);
  f.as("b"); f.rows.users[1].isActive = false;
  await assert.rejects(setNotifications._handler(f.ctx, { enabled: true }), /ACCOUNT_INACTIVE/);
});

test("sync completion, bounded retries and explicit retry preserve desired preference and other user fields", async () => {
  const f = pushFixture();
  await setNotifications._handler(f.ctx, { enabled: false });
  const args = { userId: "a", version: 1 };
  assert.deepEqual(await notificationPreference._handler(f.ctx, args), { userId: "a", fullName: "User a", enabled: false });
  assert.equal(await notificationPreference._handler(f.ctx, { ...args, version: 0 }), null);
  for (let attempt = 0; attempt < 4; attempt++) {
    await notificationSyncResult._handler(f.ctx, { ...args, attempt, success: false });
    assert.equal(f.scheduled.at(-1).args.attempt, attempt + 1);
    assert.equal(f.scheduled.at(-1).delay, 1000 * 2 ** attempt);
  }
  await notificationSyncResult._handler(f.ctx, { ...args, attempt: 4, success: false });
  assert.equal(f.rows.users[0].notificationSyncStatus, "failed");
  assert.equal(f.rows.users[0].notificationsEnabled, false);
  await setNotifications._handler(f.ctx, { enabled: false });
  assert.equal(f.rows.users[0].notificationSettingsVersion, 2);
  await notificationSyncResult._handler(f.ctx, { userId: "a", version: 2, attempt: 0, success: true });
  assert.equal(f.rows.users[0].notificationSyncStatus, "synced");
  const writes = f.writes.length;
  await setNotifications._handler(f.ctx, { enabled: false }); assert.equal(f.writes.length, writes);
  await setNotifications._handler(f.ctx, { enabled: true });
  assert.equal(f.rows.users[0].notificationsEnabled, true);
  assert.equal(f.rows.users[0].fullName, "User a");
});

test("late provider completions trigger reconciliation of the latest saved version", async () => {
  const f = pushFixture();
  Object.assign(f.rows.users[0], { notificationsEnabled: true, notificationSettingsVersion: 2, notificationSyncStatus: "synced" });
  await notificationSyncResult._handler(f.ctx, { userId: "a", version: 1, attempt: 0, success: true });
  assert.equal(f.rows.users[0].notificationsEnabled, true);
  assert.equal(f.rows.users[0].notificationSyncStatus, "pending");
  assert.deepEqual(f.scheduled.at(-1).args, { userId: "a", version: 2, attempt: 0 });
});

test("notifications off suppresses message/request enqueue and previously queued payloads on every device", async () => {
  const f = pushFixture();
  await f.device("b"); await f.device("b");
  const friendRequestId = await f.request(), messageId = await f.message();
  await enqueueFriendPush(f.ctx, { friendRequestId });
  assert.equal(f.rows.pushDeliveries.length, 2);
  const delivery = f.rows.pushDeliveries[0];
  assert.ok(await deliveryPayload(f.ctx, delivery));
  f.rows.users[1].notificationsEnabled = false;
  assert.equal(await deliveryPayload(f.ctx, delivery), null);
  await enqueueMessagePush(f.ctx, { messageId });
  assert.equal(f.rows.pushDeliveries.length, 2);
  f.rows.pushDeliveries.length = 0;
  await enqueueFriendPush(f.ctx, { friendRequestId }); assert.equal(f.rows.pushDeliveries.length, 0);
  f.rows.users[1].notificationsEnabled = true;
  await enqueueMessagePush(f.ctx, { messageId }); assert.equal(f.rows.pushDeliveries.length, 2);
});

test("the real Stream sync action applies call_level all/none only to its internal authenticated-owner record", async () => {
  for (const enabled of [false, true]) {
    const calls = [], results = [];
    const client = { upsertUsers: async rows => calls.push({ users: rows }), updatePushNotificationPreferences: async args => calls.push(args) };
    const module = execute("../convex/streamCalls.js", {
      "@stream-io/node-sdk": { StreamClient: class { constructor() { return client; } } },
      "./_generated/server.js": { action: config => config, internalAction: config => config },
      "./_generated/api.js": { internal: { users: { notificationPreference: "preference", notificationSyncResult: "finish" } } },
      "./lib/callPolicy.js": {}, "./lib/streamPolicy.js": {},
    }, { process: { env: { STREAM_API_KEY: "test-key", STREAM_API_SECRET: "test-secret" } } });
    const ctx = { runQuery: async () => ({ userId: "owner", fullName: "Owner", enabled }),
      runMutation: async (name, args) => results.push({ name, args }) };
    await module.syncNotificationPreference.handler(ctx, { userId: "owner", version: 2, attempt: 0 });
    assert.deepEqual(calls[1], { preferences: [{ user_id: "owner", call_level: enabled ? "all" : "none" }] });
    assert.equal(results[0].args.success, true);
    client.updatePushNotificationPreferences = async () => { throw Error("PRIVATE_CREDENTIAL_OR_REQUEST"); };
    await module.syncNotificationPreference.handler(ctx, { userId: "owner", version: 2, attempt: 1 });
    assert.equal(results[1].args.success, false);
    ctx.runQuery = async () => null;
    await module.syncNotificationPreference.handler(ctx, { userId: "owner", version: 1, attempt: 0 });
    assert.equal(results.length, 2);
    ctx.runQuery = async () => { throw Error("TRANSIENT_QUERY_FAILURE"); };
    await module.syncNotificationPreference.handler(ctx, { userId: "owner", version: 2, attempt: 2 });
    assert.equal(results[2].args.success, false);
  }
});

test("Stream ring/missed push handlers respect the current account preference before native/local alerts", async () => {
  const effects = { native: 0, local: 0 }, user = { isActive: true, notificationsEnabled: false };
  const call = { _id: "call", direction: "incoming", receiverId: "owner", peer: { fullName: "Peer" }, historyVisible: false };
  const storage = {};
  const module = execute("../lib/streamNotifications.js", {
    "react-native": { Platform: { OS: "android" }, AppState: {} },
    "expo-notifications": { AndroidImportance: { DEFAULT: 3 }, setNotificationChannelAsync: async () => {},
      scheduleNotificationAsync: async () => { effects.local++; } },
    "@react-native-async-storage/async-storage": { getItem: async key => storage[key] ?? null,
      setItem: async (key, value) => { storage[key] = value; } },
    "../convex/_generated/api": { api: { users: { current: "user" }, calls: { getByStreamId: "call" } } },
    "./streamRuntime": { callBackend: async (kind, ref) => ref === "user" ? user :
      call,
      streamSDK: () => ({ firebaseDataHandler: async () => { effects.native++; } }) },
  });
  const push = type => ({ data: { sender: "stream.video", type, call_cid: "saflal_audio:call" } });
  await module.handleStreamMessage(push("call.ring")); await module.handleStreamMessage(push("call.missed"));
  assert.deepEqual(effects, { native: 0, local: 0 });
  user.notificationsEnabled = true;
  await module.handleStreamMessage(push("call.missed")); assert.equal(effects.local, 0);
  call.historyVisible = true;
  await module.handleStreamMessage(push("call.ring")); await module.handleStreamMessage(push("call.missed"));
  assert.deepEqual(effects, { native: 1, local: 1 });
});

function languageFixture() {
  const events = [], values = { lng: "en" };
  const args = { language: "ar", i18n: { language: "en", changeLanguage: async lang => { events.push(`language:${lang}`); } },
    storage: { getItem: async key => values[key] ?? null, setItem: async (key, value) => { values[key] = value; }, removeItem: async key => { delete values[key]; } },
    layout: { isRTL: false, allowRTL: value => events.push(`allow:${value}`), forceRTL: value => events.push(`force:${value}`) },
    reload: async () => events.push("reload") };
  return { args, events, values };
}
test("language choice persists and uses a release-compatible reload for RTL changes", async () => {
  const h = languageFixture(); await changeAppLanguage(h.args);
  assert.equal(h.values.lng, "ar"); assert.deepEqual(h.events, ["language:ar", "allow:true", "force:true", "reload"]);
  const web = languageFixture(); await changeAppLanguage({ ...web.args, native: false });
  assert.equal(web.values.lng, "ar"); assert.ok(!web.events.includes("reload"));
});
test("language failures roll back safely, unsupported choices and active calls do not change language", async () => {
  for (const overrides of [{ language: "fr" }, { hasActiveCall: true }]) {
    const h = languageFixture(); await assert.rejects(changeAppLanguage({ ...h.args, ...overrides }));
    assert.equal(h.values.lng, "en"); assert.deepEqual(h.events, []);
  }
  const h = languageFixture(); h.args.reload = async () => { throw Error("reload unavailable"); };
  await assert.rejects(changeAppLanguage(h.args), /reload unavailable/);
  assert.equal(h.values.lng, "en"); assert.ok(h.events.includes("language:en")); assert.equal(h.events.at(-1), "force:false");
  const same = languageFixture(); await changeAppLanguage({ ...same.args, language: "en" });
  assert.deepEqual(same.events, []);
});

test("language provider shows loading before changing direction, deduplicates taps and clears loading after failure", async () => {
  for (const fail of [false, true]) {
    const h = languageFixture(), loading = [];
    if (fail) h.args.reload = async () => { throw Error("reload unavailable"); };
    const { LngProvider } = execute("../context/LngContext.js", {
      react: { createContext: () => ({ Provider: "provider" }), useEffect() {},
        useRef: current => ({ current }), useState: initial => [initial, value => loading.push(value)] },
      "@react-native-async-storage/async-storage": h.args.storage,
      "react-i18next": { useTranslation: () => ({ i18n: h.args.i18n }) },
      "react-native": { I18nManager: h.args.layout, Platform: { OS: "android" } },
      expo: { reloadAppAsync: h.args.reload },
      "../utils/registerForPushNotificationsAsync": {},
      "../lib/changeAppLanguage": { changeAppLanguage },
      "../store/callStore": { useCallStore: { getState: () => ({ callState: "idle" }) } },
    });
    const { changeLanguage } = LngProvider({ children: null }).props.value;
    await changeLanguage("en"); assert.deepEqual(loading, []);
    const pending = changeLanguage("ar");
    assert.deepEqual(loading, [true]); assert.deepEqual(h.events, []);
    await changeLanguage("ar"); assert.deepEqual(loading, [true]);
    if (fail) await assert.rejects(pending, /reload unavailable/);
    else await pending;
    assert.deepEqual(loading, [true, false]);
    assert.equal(h.values.lng, fail ? "en" : "ar");
  }
});
