import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import ts from "typescript";
import { createVoiceRecorder } from "../lib/voiceRecorder.js";
import { readVoiceRecording, voiceTime } from "../lib/voiceClient.js";
import * as activity from "../lib/voiceActivity.js";
import { chatText } from "../components/chat/chatText.js";

const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve }; };
const flush = async () => { await new Promise(setImmediate); };

// Exercise the real JSX responder handlers and controller together. The native
// microphone, files and Convex transport remain mocked; these are not device tests.
function harness({ granted = true, screenReader = false } = {}) {
  const slots = [], dependencies = [], cleanups = [];
  let index = 0, effects = [], uuid = 0;
  const h = { records: 0, stops: 0, sends: [], uploads: [], reads: [], phases: [], granted,
    prepare: async () => {}, transport: async () => ({}), call: "idle" };
  const onPhaseChange = phase => h.phases.push(phase);
  const native = { uri: "file:///clip.m4a", currentTime: 2,
    prepareToRecordAsync: () => h.prepare(), record: () => { h.records++; }, stop: async () => { h.stops++; } };
  const app = { currentState: "active", addEventListener: (_event, fn) => { h.background = () => { app.currentState = "background"; fn("background"); }; return { remove() {} }; } };
  const navigation = { isFocused: () => true, addListener: (_event, fn) => { h.blur = fn; return () => {}; } };
  const session = { callState: "idle", getToken: async () => "token",
    setRecording() {}, stopPlayback() {} };
  const mutations = {
    begin: async () => ({ uploadId: "upload" }), cancel: async () => {},
    send: async args => { h.sends.push(args); return h.transport(); },
  };
  const mocks = {
    react: { ...React,
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { slots[i] = value; }]; },
      useEffect(fn, deps) { const i = index++; if (!dependencies[i] || deps.some((dep, j) => dep !== dependencies[i][j])) {
        dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
      } },
    },
    "react-native": { View: "View", Text: "Text", TouchableOpacity: "Button", ActivityIndicator: "Spinner",
      Platform: { OS: "android" }, AppState: app, Alert: { alert() {} }, useWindowDimensions: () => ({ width: 400 }),
      AccessibilityInfo: { isScreenReaderEnabled: async () => screenReader, addEventListener: () => ({ remove() {} }) } },
    "expo-router/react-navigation": { usePreventRemove() {} },
    "expo-router": { useNavigation: () => navigation },
    "convex/react": { useMutation: name => mutations[name] },
    "expo-audio": { RecordingPresets: { HIGH_QUALITY: {} }, useAudioRecorder: () => native,
      useAudioRecorderState: () => ({ durationMillis: h.records ? 2000 : 0 }), setAudioModeAsync: async () => {},
      AudioModule: { getRecordingPermissionsAsync: async () => ({ granted: h.granted }),
        requestRecordingPermissionsAsync: async () => ({ granted: h.granted }) } },
    "expo-crypto": { randomUUID: () => `voice-operation-${++uuid}` },
    "expo/fetch": { fetch: (...args) => fetcher(...args) },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "../../convex/_generated/api": { api: { voice: { beginAudioUpload: "begin", cancelAudioUpload: "cancel" }, messages: { sendAudio: "send" } } },
    "./VoiceSession": { useVoiceSession: () => session },
    "./VoiceMessage": { __esModule: true, default: "VoicePreview" },
    "../../lib/voiceClient": { voiceTime, readVoiceRecording, authenticatedVoiceFetch: (fetcher, _token, path, options) => fetcher(path, options) },
    "../../lib/voiceRecorder": { createVoiceRecorder },
    "../../store/callStore": { useCallStore: { getState: () => ({ callState: h.call }) } },
    "../../lib/voiceActivity": activity,
  };
  const path = fileURLToPath(new URL("../components/chat/VoiceRecorder.jsx", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const module = { exports: {} }, require = createRequire(path);
  const fetcher = async (uri, options) => {
    if (uri.startsWith("file://")) {
      h.reads.push({ uri, options });
      return { ok: true, arrayBuffer: async () => new Uint8Array(100).buffer,
        blob() { throw Error("Native Blob conversion must not be used"); } };
    }
    h.uploads.push(options);
    if (h.uploadFails) throw Error("offline");
    return new Response(null, { status: 200 });
  };
  new Function("require", "module", "exports", "fetch", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports, fetcher);
  h.render = () => {
    index = 0; effects = [];
    h.tree = module.exports.default({ chatId: "chat", text: chatText.en, onPhaseChange });
    effects.forEach(fn => fn()); return h.tree;
  };
  h.find = predicate => {
    const visit = node => {
      if (Array.isArray(node)) return node.flatMap(visit);
      if (!node || typeof node !== "object") return [];
      if (typeof node.type === "function") return visit(node.type(node.props));
      return [...(predicate(node) ? [node] : []), ...visit(node.props?.children)];
    };
    return visit(h.tree);
  };
  h.mic = () => h.find(node => node.props?.testID === "voice-mic")[0];
  h.unmount = () => cleanups.forEach(fn => fn?.());
  h.render(); return h;
}

test("mic press starts recording immediately; release sends once without preview or a second Send", async () => {
  const h = harness(), gate = deferred(); h.transport = () => gate.promise;
  try {
    h.mic().props.onResponderGrant(); await flush(); h.render();
    assert.equal(h.records, 1); assert.equal(h.tree.props.style.width, 48);
    assert.equal(h.mic().props.onResponderMove, undefined); // Finger movement cannot lock recording.
    assert.equal(h.find(node => node.type === "Text" && node.props.children === "0:02").length, 1);
    h.mic().props.onResponderRelease(); h.mic().props.onResponderRelease(); await flush(); h.render();
    assert.equal(h.stops, 1); assert.equal(h.uploads.length, 1); assert.equal(h.sends.length, 1);
    assert.equal(h.reads[0].uri, "file:///clip.m4a");
    assert.ok(h.uploads[0].body instanceof Uint8Array); assert.equal(h.uploads[0].body.byteLength, 100);
    assert.equal(h.find(node => node.type === "VoicePreview").length, 0);
    assert.equal(h.mic().props.accessibilityState.busy, true);
    gate.resolve(); await flush(); h.render();
    assert.equal(h.phases.at(-1), "idle"); assert.equal(h.phases.includes("preview"), false);
  } finally { gate.resolve(); await flush(); h.unmount(); }
});

test("releasing during preparation or denying microphone access never sends", async () => {
  for (const granted of [false, true]) {
    const h = harness({ granted }), gate = deferred(); h.prepare = () => gate.promise;
    try {
      h.mic().props.onResponderGrant(); await flush();
      h.mic().props.onResponderRelease(); gate.resolve(); await flush(); h.render();
      assert.equal(h.records, 0); assert.equal(h.sends.length, 0); assert.equal(h.phases.at(-1), "idle");
      if (!granted) assert.equal(h.find(node => node.props?.accessibilityRole === "alert").length, 1);
    } finally { gate.resolve(); h.unmount(); }
  }
});

test("responder termination retains a recoverable clip and does not auto-send", async () => {
  const h = harness();
  try {
    h.mic().props.onResponderGrant(); await flush(); h.render();
    h.mic().props.onResponderTerminate(); await flush(); h.render();
    assert.equal(h.sends.length, 0); assert.equal(h.find(node => node.type === "VoicePreview").length, 1);
  } finally { h.unmount(); }
});

test("a failed automatic send offers retry with the same recording and message key", async () => {
  const h = harness(); h.transport = async () => { throw Error("offline"); };
  try {
    h.mic().props.onResponderGrant(); await flush(); h.mic().props.onResponderRelease(); await flush(); h.render();
    assert.equal(h.phases.at(-1), "preview");
    const retry = h.find(node => node.type === "Button" && node.props.accessibilityLabel === chatText.en.voiceSend)[0];
    assert.ok(retry); h.transport = async () => ({}); await retry.props.onPress(); await flush(); h.render();
    assert.equal(h.records, 1); assert.equal(h.sends.length, 2); assert.deepEqual(h.sends[0], h.sends[1]);
    assert.equal(h.phases.at(-1), "idle");
  } finally { h.unmount(); }
});

test("screen-reader Start and Stop send without a separate preview action", async () => {
  const h = harness({ screenReader: true });
  try {
    await flush(); h.render();
    let button = h.find(node => node.type === "Button")[0];
    button.props.onPress(); await flush(); h.render();
    button = h.find(node => node.type === "Button")[0];
    assert.equal(button.props.accessibilityLabel, chatText.en.voiceStop);
    button.props.onPress(); await flush(); h.render();
    assert.equal(h.sends.length, 1); assert.equal(h.phases.includes("preview"), false);
  } finally { h.unmount(); }
});

test("upload failure retains the recording and retries its exact bytes without native Blob conversion", async () => {
  const h = harness(); h.uploadFails = true;
  try {
    h.mic().props.onResponderGrant(); await flush(); h.mic().props.onResponderRelease(); await flush(); h.render();
    assert.equal(h.reads.length, 1); assert.equal(h.sends.length, 0); assert.equal(h.phases.at(-1), "preview");
    assert.equal(h.find(node => node.props?.accessibilityRole === "alert")[0].props.children, chatText.en.voiceUploadError);
    h.uploadFails = false;
    const retry = h.find(node => node.type === "Button" && node.props.accessibilityLabel === chatText.en.voiceSend)[0];
    await retry.props.onPress(); await flush(); h.render();
    assert.equal(h.records, 1); assert.equal(h.reads.length, 2); assert.equal(h.sends.length, 1);
    assert.deepEqual(h.uploads[0].body, h.uploads[1].body);
    assert.equal(h.phases.at(-1), "idle");
  } finally { h.unmount(); }
});
