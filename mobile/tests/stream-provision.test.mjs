import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { CALL_TYPE, liveCall, RING_MS, validCallRequest } from "../convex/lib/callPolicy.js";
import { restrictedGrants, validStreamPolicy } from "../convex/lib/streamPolicy.js";

function execute(file, mocks, globals = {}) {
  const url = new URL(file, import.meta.url), require = createRequire(url), module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(url, "utf8"), { fileName: url.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  new Function("require", "module", "exports", "process", "console", compiled.outputText)(
    name => mocks[name] ?? require(name), module, module.exports, globals.process ?? process, globals.console ?? console);
  return module.exports;
}
function serverHarness({ fresh = true, status = "ringing", provisioned = false, failure } = {}) {
  const effects = { requests: [], failed: 0, logs: [], users: 0 };
  const call = { _id: "call", callerId: "a", receiverId: "b", streamCallId: "stream-call", status, provisioned };
  const client = { upsertUsers: async () => { effects.users++; }, video: {
    listCallTypes: async () => ({ call_types: { [CALL_TYPE]: {
      grants: restrictedGrants(CALL_TYPE), settings: { video: { enabled: false }, screensharing: { enabled: false },
        backstage: { enabled: false }, limits: { max_participants: 2 } },
    } } }),
    call: () => ({ getOrCreate: async request => {
      effects.requests.push(request);
      if (failure) throw failure;
    } }),
  } };
  const actions = execute("../convex/streamCalls.js", {
    "@stream-io/node-sdk": { StreamClient: class { constructor() { return client; } } },
    "./_generated/server.js": { action: config => config, internalAction: config => config },
    "./_generated/api.js": { internal: { calls: { reserve: "reserve", provisionInfo: "info", markProvisioned: "mark", fail: "fail" } } },
    "./lib/callPolicy.js": { CALL_TYPE, liveCall }, "./lib/streamPolicy.js": { validStreamPolicy },
  }, { process: { env: { STREAM_API_KEY: "test-key", STREAM_API_SECRET: "test-secret" } },
    console: { error: (...args) => effects.logs.push(args) } });
  const ctx = { runQuery: async () => ({ me: { _id: "a", fullName: "A" }, peer: { _id: "b", fullName: "B" } }),
    runMutation: async name => {
      if (name === "reserve") return { call, fresh };
      if (name === "mark") return true;
      if (name === "fail") { effects.failed++; return; }
      throw Error("Unexpected mutation");
    } };
  return { effects, run: () => actions.startCall.handler(ctx, { chatId: "chat", requestId: "request" }) };
}
test("real reservation produces bounded unique Stream IDs for long requests and preserves idempotency", async () => {
  const rows = [], scheduled = [];
  const actions = execute("../convex/calls.js", {
    "./_generated/server.js": Object.fromEntries(["internalMutation", "internalQuery", "mutation", "query"].map(name => [name, config => config])),
    "./_generated/api.js": { internal: { calls: { expire: "expire" } } },
    "./auth.js": { requireUser: async ctx => ctx.user },
    "./lib/callPolicy.js": { liveCall, RING_MS, validCallRequest, activeCalls: async () => [],
      authorizePair: async () => ({ peer: { _id: "p".repeat(32) } }) },
  });
  const ctx = { user: { _id: "a".repeat(32) }, scheduler: { runAfter: async (...args) => scheduled.push(args) }, db: {
    query(table) {
      assert.equal(table, "calls"); const filters = [];
      const builder = { eq: (key, value) => { filters.push([key, value]); return builder; } };
      const matches = () => rows.filter(row => filters.every(([key, value]) => row[key] === value));
      return { withIndex(name, fn) { fn(builder); return this; }, order() { return this; },
        unique: async () => matches()[0] ?? null, take: async n => matches().slice(0, n) };
    },
    insert: async (table, data) => {
      assert.equal(table, "calls"); const _id = String(rows.length + 1).padStart(32, "c");
      rows.push({ _id, ...data }); return _id;
    },
    patch: async (table, id, patch) => { assert.equal(table, "calls"); Object.assign(rows.find(row => row._id === id), patch); },
    get: async (table, id) => { assert.equal(table, "calls"); return { ...rows.find(row => row._id === id) }; },
  } };
  const requestId = "r".repeat(100);
  const first = await actions.reserve.handler(ctx, { chatId: "chat", requestId });
  assert.ok(first.fresh);
  assert.ok(first.call.streamCallId.length <= 64);
  assert.match(first.call.streamCallId, /^saflal_[a-z0-9]+$/);
  assert.ok(!first.call.streamCallId.includes(requestId));
  const again = await actions.reserve.handler(ctx, { chatId: "chat", requestId });
  assert.equal(again.fresh, false); assert.equal(again.call.streamCallId, first.call.streamCallId);
  ctx.user = { _id: "b".repeat(32) };
  const other = await actions.reserve.handler(ctx, { chatId: "chat", requestId });
  assert.notEqual(other.call.streamCallId, first.call.streamCallId);
  assert.ok(other.call.streamCallId.length <= 64);
  assert.equal(rows.length, 2); assert.equal(scheduled.length, 2);
  assert.ok(rows.every(row => row.streamCallId && row.requestId === requestId));
});
test("actual call action inherits verified audio policy without invalid partial video overrides", async () => {
  const h = serverHarness();
  assert.equal((await h.run()).streamCallId, "stream-call");
  const request = h.effects.requests[0];
  assert.equal(request.video, false); assert.equal(request.ring, false);
  assert.equal(request.data.settings_override, undefined);
  assert.deepEqual(request.data.members, [{ user_id: "a" }, { user_id: "b" }]);
  assert.equal(h.effects.failed, 0);
});
test("Stream provisioning failures finish the reservation and log codes without private SDK details", async () => {
  const h = serverHarness({ failure: { code: 4, statusCode: 400, message: "target_resolution PRIVATE_REQUEST_TOKEN", request: "PRIVATE_USER_DATA" } });
  await assert.rejects(h.run(), /CALL_CONNECTION_FAILED/);
  assert.equal(h.effects.failed, 1);
  assert.deepEqual(h.effects.logs, [["CALL_PROVISION_FAILED", { stage: "create", streamCode: 4, status: 400, resolutionValidation: true }]]);
  assert.ok(!JSON.stringify(h.effects.logs).includes("PRIVATE"));
});
test("idempotent retries return ready calls, never resurrect failed calls or expose incomplete calls", async () => {
  for (const [status, provisioned, expected] of [["failed", false, /CALL_CONNECTION_FAILED/], ["ended", true, /CALL_UNAVAILABLE/], ["ringing", false, /CALL_BUSY/]]) {
    const h = serverHarness({ fresh: false, status, provisioned });
    await assert.rejects(h.run(), expected);
    assert.equal(h.effects.users, 0); assert.equal(h.effects.requests.length, 0);
  }
  const ready = serverHarness({ fresh: false, status: "accepted", provisioned: true });
  assert.equal((await ready.run()).streamCallId, "stream-call");
  assert.equal(ready.effects.requests.length, 0);
});

function uiHarness(error) {
  const requests = [], routes = [];
  let sequence = 0;
  const jsx = (type, props) => ({ type, props });
  const module = execute("../components/calls/CallProvider.jsx", {
    react: { createContext: () => ({ Provider: "provider" }), useCallback: fn => fn, useContext: () => null,
      useEffect: () => {}, useRef: current => ({ current }), useState: initial => [initial, () => {}] },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { Platform: { OS: "android" }, Alert: { alert() {} }, PermissionsAndroid: {
      PERMISSIONS: { RECORD_AUDIO: "microphone" }, RESULTS: { GRANTED: "granted" }, request: async () => "granted" } },
    "convex/react": { useAction: () => async args => { requests.push({ ...args }); if (requests.length === 1) throw error; return { callId: "call" }; } },
    "expo-crypto": { randomUUID: () => `request-${++sequence}` },
    "expo-notifications": { requestPermissionsAsync: async () => {} },
    "expo-router": { useRouter: () => ({ push: route => routes.push(route) }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({}) },
    "react-i18next": { useTranslation: () => ({ i18n: { language: "en" } }) },
    "../../convex/_generated/api": { api: { streamCalls: { startCall: "start" } } },
    "../../context/AuthSessionContext": { useAuthSession: () => ({ ready: true, profile: { _id: "user" } }) },
    "../../store/callStore": { useCallStore: { setState() {}, getState: () => ({ reset() {} }) } },
    "../../lib/streamRuntime": { createStreamClient: async () => ({}), streamSDK: () => null },
    "../chat/ChatQueryBoundary": {}, "./callText": { callText: { en: {} }, callError: () => "error" },
  });
  const outer = module.default({ children: null });
  const provider = outer.type(outer.props);
  return { start: provider.props.value.startCall, requests, routes };
}
test("real call UI creates a fresh request after a definitive rejection and preserves keys after uncertain network errors", async () => {
  for (const definitive of [true, false]) {
    const error = definitive ? { data: "CALL_CONNECTION_FAILED" } : Error("Network lost");
    const h = uiHarness(error);
    await h.start("chat"); await h.start("chat");
    assert.equal(h.requests.length, 2);
    assert.equal(h.requests[0].requestId === h.requests[1].requestId, !definitive);
    assert.equal(h.routes.length, 1);
  }
});
