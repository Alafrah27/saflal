import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import ts from "typescript";
import * as activity from "../lib/voiceActivity.js";
import { authenticatedVoiceFetch } from "../lib/voiceClient.js";

// Run the real provider with native player/auth boundaries. These tests do not
// establish audible playback or native HTTP header/seek behavior on a device.
function harness({ integrated = false } = {}) {
  const slots = [], dependencies = [], cleanups = [];
  let index = 0, effects = [], unmounted = false;
  const h = { tokens: [], playerCalls: [], lateWrites: 0, call: "idle", focused: true,
    status: { playing: false, currentTime: 0, duration: 2, didJustFinish: false, error: null },
    token: async () => "clerk-convex-token", mode: async () => {} };
  const player = {
    pause() { h.status.playing = false; h.playerCalls.push("pause"); },
    replace(source) { h.source = source; h.playerCalls.push(source ? "replace" : "clear"); h.status.error = null; },
    play() { h.status.playing = true; h.playerCalls.push("play"); },
    seekTo: async value => { h.status.currentTime = value; },
  };
  const app = { currentState: "active", addEventListener: (_type, fn) => { h.appChange = fn; return { remove() {} }; } };
  const navigation = { isFocused: () => h.focused, addListener: (_type, fn) => { h.blur = fn; return () => {}; } };
  const mocks = {
    react: { ...React,
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { if (unmounted) h.lateWrites++; slots[i] = value; }]; },
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useCallback(fn, deps) { const i = index++; if (!dependencies[i] || deps.some((dep, j) => dep !== dependencies[i][j])) {
        dependencies[i] = deps; slots[i] = fn;
      } return slots[i]; },
      useEffect(fn, deps) { const i = index++; if (!dependencies[i] || deps.some((dep, j) => dep !== dependencies[i][j])) {
        dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
      } },
    },
    "react-native": { AppState: app },
    "@clerk/expo": { useAuth: () => ({ sessionClaims: integrated ? { aud: "convex" } : {},
      getToken: async options => {
        h.tokens.push(options);
        if (integrated && options.template) throw Error("JWT template does not exist");
        return h.token();
      } }) },
    "expo-router": { useNavigation: () => navigation },
    "expo-audio": { useAudioPlayer: (_source, options) => { h.playerOptions = options; return player; },
      useAudioPlayerStatus: () => h.status, setAudioModeAsync: options => h.mode(options) },
    "../../store/callStore": { useCallStore: Object.assign(selector => selector({ callState: h.call }), { getState: () => ({ callState: h.call }) }) },
    "../../lib/voiceClient": { voiceOrigin: () => "https://example.convex.site" },
    "../../lib/voiceActivity": activity,
  };
  const path = fileURLToPath(new URL("../components/chat/VoiceSession.jsx", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", compiled)(name => mocks[name] ?? require(name), module, module.exports);
  h.render = () => {
    index = 0; effects = [];
    h.session = module.exports.default({ accountId: "account", chatId: "chat", children: null }).props.value;
    effects.forEach(fn => fn()); return h.session;
  };
  h.background = () => { app.currentState = "background"; h.appChange("background"); };
  h.unmount = () => { unmounted = true; cleanups.forEach(fn => fn?.()); };
  h.render(); h.render(); return h;
}

test("private audio streams through native player auth headers; pause/resume reuses the player", async () => {
  const h = harness();
  try {
    await h.session.toggle("one"); h.render();
    assert.equal(h.playerOptions.downloadFirst, false);
    assert.equal(h.source.uri, "https://example.convex.site/voice/one");
    assert.equal(h.source.headers.Authorization, "Bearer clerk-convex-token");
    assert.doesNotMatch(h.source.uri, /clerk-convex-token/);
    assert.deepEqual(h.tokens, [{ template: "convex", skipCache: true }]);
    await h.session.toggle("one"); h.render(); assert.equal(h.status.playing, false);
    await h.session.toggle("one"); h.render(); assert.equal(h.status.playing, true); assert.equal(h.tokens.length, 1);
    await h.session.toggle("two"); h.render(); assert.equal(h.tokens.length, 2); assert.equal(h.session.activeId, "two");
    h.session.stopPlayback(); assert.equal(h.source, null);
  } finally { h.unmount(); }
});

test("Clerk integration voice upload and playback use the session token, including a fresh-token retry", async () => {
  const original = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.convex.site";
  const h = harness({ integrated: true });
  try {
    const requests = [];
    await authenticatedVoiceFetch(async (url, options) => {
      requests.push({ url, options });
      return new Response(null, { status: requests.length === 1 ? 401 : 204 });
    }, h.session.getToken, "/voice/upload?uploadId=test", { method: "POST", body: new Uint8Array(100) });
    assert.deepEqual(h.tokens, [{ skipCache: false }, { skipCache: true }]);
    assert.equal(requests[1].options.headers.Authorization, "Bearer clerk-convex-token");
    assert.doesNotMatch(requests[1].url, /clerk-convex-token/);
    await h.session.toggle("one");
    assert.deepEqual(h.tokens.at(-1), { skipCache: true });
    assert.equal(h.source.headers.Authorization, "Bearer clerk-convex-token");
  } finally {
    h.unmount();
    if (original === undefined) delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = original;
  }
});

test("exceptional local preview uses only the recorder URI and supports pause/replay", async () => {
  const h = harness();
  try {
    await h.session.toggle("preview", "file:///unsent.m4a"); h.render();
    assert.deepEqual(h.source, { uri: "file:///unsent.m4a" });
    await h.session.toggle("preview", "file:///unsent.m4a"); h.render(); assert.equal(h.status.playing, false);
    h.status.currentTime = 2; h.status.didJustFinish = true;
    await h.session.toggle("preview", "file:///unsent.m4a"); assert.equal(h.status.currentTime, 0);
    h.session.stopPlayback(); assert.equal(h.tokens.length, 0); assert.equal(h.source, null);
  } finally { h.unmount(); }
});

test("background, calls, recording, expiry and blur unload private playback and auth headers", async () => {
  for (const reason of ["background", "call", "recording", "expired", "blur"]) {
    const h = harness();
    try {
      await h.session.toggle("one"); h.render();
      if (reason === "background") h.background();
      if (reason === "call") { h.call = "incoming"; h.render(); }
      if (reason === "recording") h.session.setRecording(true);
      if (reason === "expired") h.session.removeMessage("one");
      if (reason === "blur") { h.focused = false; h.blur(); }
      assert.equal(h.source, null); assert.equal(h.status.playing, false);
    } finally { h.unmount(); }
  }
});

test("late token results cannot start playback after unmount, recording, expiry or switching clips", async () => {
  for (const reason of ["leave", "expired", "recording", "switch"]) {
    const h = harness(); let done;
    h.token = () => new Promise(resolve => { done = resolve; });
    const pending = h.session.toggle("one", undefined, reason === "expired" ? Date.now() + 1 : undefined);
    await Promise.resolve();
    if (reason === "leave") h.unmount();
    if (reason === "expired") await new Promise(resolve => setTimeout(resolve, 5));
    if (reason === "recording") h.session.setRecording(true);
    if (reason === "switch") await h.session.toggle("preview", "file:///other.m4a");
    done("old-token"); await pending;
    assert.equal(h.playerCalls.filter(call => call === "play").length, reason === "switch" ? 1 : 0);
    assert.equal(h.lateWrites, 0);
    if (reason === "switch") assert.deepEqual(h.source, { uri: "file:///other.m4a" });
    if (reason !== "leave") h.unmount();
  }
});

test("missing auth and native playback errors are retryable; active calls cannot play", async () => {
  const h = harness();
  try {
    h.token = async () => null;
    await h.session.toggle("one"); h.render(); assert.equal(h.session.errorId, "one"); assert.equal(h.source, null);
    h.token = async () => "new-token"; await h.session.toggle("one"); h.render();
    h.status.error = "decode failure"; h.render(); h.render();
    assert.equal(h.session.errorId, "one"); assert.equal(h.source, null);
    await h.session.toggle("one"); h.render(); assert.equal(h.session.activeId, "one");
    assert.equal(h.source.headers.Authorization, "Bearer new-token");
    h.call = "active"; h.render(); await h.session.toggle("two"); assert.equal(h.tokens.length, 3);
  } finally { h.unmount(); }
});
