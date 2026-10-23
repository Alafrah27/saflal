import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceRecorder } from "../lib/voiceRecorder.js";
import { authenticatedVoiceFetch, readVoiceRecording, voiceTime, voiceOrigin } from "../lib/voiceClient.js";
import { claimVoiceRecorder, releaseVoiceRecorder, voiceRecorderActive } from "../lib/voiceActivity.js";

const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; };
function fixture(overrides = {}) {
  const f = { changes: [], removed: [], modes: [], sends: [], uploads: [], cancels: [], begins: [], records: 0, stopped: 0, active: true };
  const deps = {
    recorder: { uri: "file:///private/clip.m4a", currentTime: 2,
      prepareToRecordAsync: async () => {}, record: () => { f.records++; }, stop: async () => { f.stopped++; } },
    change: state => f.changes.push(state), uuid: () => "stable-voice-operation-key", size: () => 100,
    canUseAudio: () => f.active, mode: async value => f.modes.push(value), recording: value => { f.recording = value; },
    permission: async () => ({ granted: true }), remove: uri => f.removed.push(uri), stopPlayback: () => {},
    begin: async key => { f.begins.push(key); return { uploadId: "upload" }; },
    upload: async clip => f.uploads.push({ ...clip }), send: async clip => f.sends.push({ ...clip }),
    cancel: async id => f.cancels.push(id), ...overrides,
  };
  f.controller = createVoiceRecorder(deps); f.deps = deps;
  return f;
}

test("hold/release sends one voice message; duplicate releases cannot duplicate it", async () => {
  const f = fixture(), c = f.controller; await c.start(); assert.equal(c.state.phase, "recording");
  await Promise.all([c.release(), c.release()]);
  assert.equal(f.records, 1); assert.equal(f.sends.length, 1); assert.equal(c.state.phase, "idle"); assert.equal(c.state.clip, null);
  assert.deepEqual(f.modes, [true, false]); c.dispose();
  assert.equal(f.changes.some(change => change.phase === "preview"), false);
});

test("first permission prompt never records or sends, and denial has a safe actionable error", async () => {
  for (const granted of [true, false]) {
    const f = fixture({ permission: async ask => ({ granted: ask && granted }) });
    await f.controller.start(); await f.controller.release();
    assert.equal(f.records, 0); assert.equal(f.sends.length, 0); assert.equal(f.recording, false);
    assert.equal(f.controller.state.error, granted ? "voiceReady" : "voicePermission"); f.controller.dispose();
  }
});

test("release during permission or native preparation cannot later start recording", async () => {
  for (const step of ["permission", "prepare"]) {
    const gate = deferred();
    const f = fixture(step === "permission" ? { permission: () => gate.promise } : {});
    if (step === "prepare") f.deps.recorder.prepareToRecordAsync = () => gate.promise;
    const pending = f.controller.start(); await Promise.resolve(); await Promise.resolve();
    await f.controller.release(); gate.resolve({ granted: true }); await pending;
    assert.equal(f.records, 0); assert.equal(f.sends.length, 0); assert.equal(f.controller.state.phase, "idle");
    assert.equal(f.recording, false); f.controller.dispose();
  }
});

test("cancel discards; accessible Stop sends without a preview or second Send", async () => {
  const cancelled = fixture(); await cancelled.controller.start(); await cancelled.controller.finish("discard");
  assert.equal(cancelled.sends.length, 0); assert.equal(cancelled.controller.state.clip, null); assert.equal(cancelled.removed.length, 1); cancelled.controller.dispose();
  const f = fixture(); await f.controller.start(true); await f.controller.release();
  assert.equal(f.controller.state.phase, "locked"); assert.equal(f.sends.length, 0);
  await f.controller.finish("send"); assert.equal(f.sends.length, 1);
  assert.equal(f.changes.some(change => change.phase === "preview"), false); f.controller.dispose();
});

test("accessible recording starts locked; limit/interruption stops into preview without sending", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const interrupt of [true, false]) {
    const f = fixture(); await f.controller.start(true); assert.equal(f.controller.state.phase, "locked");
    if (interrupt) await f.controller.interrupt(); else { t.mock.timers.tick(300000); await Promise.resolve(); await Promise.resolve(); }
    assert.equal(f.controller.state.phase, "preview"); assert.equal(f.sends.length, 0); f.controller.dispose();
  }
});

test("too short, empty and oversized recordings cannot upload", async () => {
  for (const invalid of ["short", "empty", "large"]) {
    const f = fixture({ size: () => invalid === "empty" ? 0 : invalid === "large" ? 10 * 1024 * 1024 + 1 : 100 });
    if (invalid === "short") f.deps.recorder.currentTime = 0.2;
    await f.controller.start(); await f.controller.release();
    assert.equal(f.controller.state.error, "voiceInvalid"); assert.equal(f.sends.length, 0); assert.equal(f.uploads.length, 0); f.controller.dispose();
  }
});

test("native timed completion previews without trying to stop an already stopped recorder", async () => {
  const f = fixture(); await f.controller.start();
  f.deps.recorder.stop = async () => { throw Error("already stopped"); };
  await f.controller.complete({ url: "file:///private/clip.m4a" });
  assert.equal(f.controller.state.phase, "preview"); assert.equal(f.sends.length, 0); f.controller.dispose();
});

test("background completion racing native stop retains a valid preview and never sends", async () => {
  const f = fixture(); await f.controller.start();
  f.deps.recorder.stop = async () => { throw Error("already finished by OS"); };
  f.deps.recorder.getStatus = () => ({ isRecording: false });
  await f.controller.interrupt(); assert.equal(f.controller.state.phase, "preview"); assert.equal(f.sends.length, 0); f.controller.dispose();
});

test("uncertain send retry retains clip, upload ID and operation key and ignores rapid taps", async () => {
  let fail = true; const gate = deferred();
  const f = fixture({ send: async clip => { f.sends.push({ ...clip }); if (fail) throw Error("offline"); await gate.promise; } });
  await f.controller.start(true); await f.controller.finish(); await f.controller.send();
  assert.equal(f.controller.state.phase, "preview"); assert.equal(f.controller.state.error, "voiceSendError");
  fail = false; const retry = f.controller.send(); await f.controller.send(); gate.resolve(); await retry;
  assert.equal(f.begins.length, 1); assert.equal(f.sends.length, 2);
  assert.deepEqual(f.sends[0], f.sends[1]); assert.equal(f.controller.state.clip, null); f.controller.dispose();
});

test("account switch during upload aborts before send, clears the clip and suppresses late state writes", async () => {
  const gate = deferred();
  const f = fixture({ upload: () => gate.promise });
  await f.controller.start(true); await f.controller.finish(); const pending = f.controller.send(); await Promise.resolve();
  f.controller.dispose(); const writes = f.changes.length; gate.resolve(); await pending;
  assert.equal(f.sends.length, 0); assert.equal(f.controller.state.clip, null); assert.equal(f.changes.length, writes); assert.ok(f.removed.length);
});

test("active call/background prevents recording and late preparation after disposal releases the microphone", async () => {
  const f = fixture(); f.active = false; await f.controller.start(); assert.equal(f.records, 0); f.controller.dispose();
  const gate = deferred(), g = fixture(); g.deps.recorder.prepareToRecordAsync = () => gate.promise;
  const pending = g.controller.start(); await Promise.resolve(); await Promise.resolve();
  g.controller.dispose(); gate.resolve(); await pending; assert.equal(g.records, 0); assert.equal(g.recording, false);
});

test("duration labels are readable", () => {
  assert.equal(voiceTime(299.8), "4:59"); assert.equal(voiceTime(300), "5:00");
});

test("native recording transfer uses only the temporary recording URI and bounds raw byte size", async () => {
  const reads = [], bytes = new Uint8Array(100);
  const fetcher = async (uri, options) => { reads.push({ uri, options }); return { ok: true, arrayBuffer: async () => bytes.buffer }; };
  assert.deepEqual(await readVoiceRecording(fetcher, "file:///private/recording.m4a"), bytes);
  assert.equal(reads.length, 1); assert.equal(reads[0].options.headers, undefined);
  for (const uri of ["https://remote.example/file.m4a", "content://picked/file", undefined]) {
    await assert.rejects(() => readVoiceRecording(fetcher, uri));
  }
  assert.equal(reads.length, 1);
  for (const size of [0, 31, 10 * 1024 * 1024 + 1]) {
    await assert.rejects(() => readVoiceRecording(async () => ({ ok: true,
      arrayBuffer: async () => new ArrayBuffer(size) }), "file:///private/clip.m4a"), { code: "VOICE_READ_FAILED" });
  }
});

test("prepare, local-read, upload and save failures keep the same recording and identify the failed stage", async () => {
  for (const [step, code, expected] of [["begin", undefined, "voicePrepareSendError"],
    ["upload", "VOICE_READ_FAILED", "voiceReadError"], ["upload", undefined, "voiceUploadError"],
    ["send", undefined, "voiceSendError"]]) {
    const f = fixture(); const original = f.deps[step]; let fail = true;
    f.deps[step] = async (...args) => { if (fail) throw Object.assign(Error("private native error"), { code }); return original(...args); };
    await f.controller.start(); await f.controller.release();
    assert.equal(f.controller.state.phase, "preview"); assert.equal(f.controller.state.error, expected);
    const clip = f.controller.state.clip;
    fail = false; await f.controller.send();
    assert.equal(f.records, 1); assert.equal(f.sends.length, 1);
    assert.equal(f.sends[0].clientMessageId, clip.clientMessageId); assert.equal(f.controller.state.phase, "idle");
    f.controller.dispose();
  }
});

test("interrupting a release while native stop is pending cannot send", async () => {
  const gate = deferred(), f = fixture();
  f.deps.recorder.stop = () => gate.promise;
  await f.controller.start(); const pending = f.controller.release();
  await f.controller.interrupt(); gate.resolve(); await pending;
  assert.equal(f.sends.length, 0); assert.equal(f.controller.state.phase, "preview"); f.controller.dispose();
});

test("backgrounding while the audio session is releasing retains a recoverable draft", async () => {
  const gate = deferred(), f = fixture({ mode: async allowsRecording => { if (!allowsRecording) await gate.promise; } });
  await f.controller.start(); const pending = f.controller.release();
  await Promise.resolve(); await Promise.resolve(); f.active = false;
  await f.controller.interrupt(); gate.resolve(); await pending;
  assert.equal(f.sends.length, 0); assert.equal(f.controller.state.phase, "preview"); f.controller.dispose();
});

test("a failed release-to-send retries the same clip and operation without recording again", async () => {
  let failed = true;
  const f = fixture({ send: async clip => { f.sends.push({ ...clip }); if (failed) throw Error("offline"); } });
  await f.controller.start(); await f.controller.release();
  assert.equal(f.controller.state.phase, "preview"); assert.equal(f.controller.state.error, "voiceSendError");
  failed = false; await Promise.all([f.controller.send(), f.controller.send()]);
  assert.equal(f.records, 1); assert.equal(f.begins.length, 1); assert.deepEqual(f.sends[0], f.sends[1]);
  assert.equal(f.sends.length, 2); assert.equal(f.controller.state.phase, "idle"); f.controller.dispose();
});

test("private downloads refresh authentication once after 401 without putting credentials in the URL", async () => {
  const original = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.convex.site";
  try {
    const requests = [], tokens = [];
    const response = await authenticatedVoiceFetch(async (url, opts) => {
      requests.push({ url, opts }); return new Response(null, { status: requests.length === 1 ? 401 : 204 });
    }, async opts => { tokens.push(opts); return "private-token"; }, "/voice/message");
    assert.equal(response.status, 204); assert.equal(requests.length, 2); assert.equal(tokens[1].skipCache, true);
    assert.equal(requests[0].opts.headers.Authorization, "Bearer private-token"); assert.doesNotMatch(requests[0].url, /private-token/);
  } finally { if (original === undefined) delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL; else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = original; }
});

test("voice configuration rejects insecure remote origins and URL credentials before sending a token", () => {
  const original = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  try {
    for (const origin of ["http://remote.example", "https://user:password@example.com", "https://example.com/path", "https://example.com/?key=secret"]) {
      process.env.EXPO_PUBLIC_CONVEX_SITE_URL = origin; assert.throws(voiceOrigin);
    }
    process.env.EXPO_PUBLIC_CONVEX_SITE_URL = "https://example.convex.site/"; assert.equal(voiceOrigin(), "https://example.convex.site");
  } finally { if (original === undefined) delete process.env.EXPO_PUBLIC_CONVEX_SITE_URL; else process.env.EXPO_PUBLIC_CONVEX_SITE_URL = original; }
});

test("an unmounted preparing route retains microphone ownership until native cleanup completes", async () => {
  const firstOwner = Symbol(), nextOwner = Symbol(), gate = deferred();
  const f = fixture({ acquire: () => claimVoiceRecorder(firstOwner), release: () => releaseVoiceRecorder(firstOwner) });
  f.deps.recorder.prepareToRecordAsync = () => gate.promise;
  const pending = f.controller.start(); await Promise.resolve(); await Promise.resolve();
  f.controller.dispose(); assert.equal(voiceRecorderActive(), true); assert.equal(claimVoiceRecorder(nextOwner), false);
  gate.resolve(); await pending; assert.equal(voiceRecorderActive(), false);
  assert.equal(claimVoiceRecorder(nextOwner), true); releaseVoiceRecorder(nextOwner);
});
