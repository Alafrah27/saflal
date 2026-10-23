import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";
import { readVoiceRecording } from "../lib/voiceClient.js";
import { readVoiceBody } from "../convex/lib/voicePolicy.js";
import { inspectVoice } from "../convex/voiceValidation.js";

test("recorded AAC bytes pass the installed Expo fetch body normalizer and server audio validation without Blob conversion", async () => {
  const sample = readFileSync(new URL("./fixtures/voice-sample.m4a", import.meta.url));
  const bytes = await readVoiceRecording(async () => ({ ok: true,
    arrayBuffer: async () => sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength),
    blob() { throw Error("Creating blobs from ArrayBuffer is not supported"); },
  }), "file:///private/recording.m4a");
  // Execute the installed SDK's real normalizer; native/file-reader boundaries
  // must never run for this body type. This is not a real-device upload test.
  const source = readFileSync(new URL("../node_modules/expo/src/winter/fetch/RequestUtils.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } });
  const module = { exports: {} };
  const never = () => { throw Error("Unexpected Blob/FormData conversion"); };
  new Function("require", "module", "exports", compiled.outputText)(
    () => ({ blobToArrayBufferAsync: never, convertFormDataAsync: never }), module, module.exports);
  const normalized = await module.exports.normalizeBodyInitAsync(bytes);
  assert.ok(normalized.body instanceof Uint8Array);
  assert.deepEqual(Buffer.from(normalized.body), sample);
  const uploaded = await readVoiceBody(new Request("https://voice.test/upload", {
    method: "POST", body: normalized.body, headers: { "Content-Type": "audio/mp4" },
  }));
  assert.equal(await inspectVoice(uploaded), 1.024);
});

test("aborted or failed local reads cannot return bytes or expose native error details", async () => {
  const abort = new AbortController(); abort.abort(); let reads = 0;
  await assert.rejects(() => readVoiceRecording(async () => { reads++; }, "file:///clip.m4a", abort.signal), { code: "VOICE_READ_FAILED" });
  assert.equal(reads, 0);
  await assert.rejects(() => readVoiceRecording(async () => { throw Error("private URI or token"); }, "file:///clip.m4a"),
    error => error.code === "VOICE_READ_FAILED" && error.message === "VOICE_UNAVAILABLE");
  const duringRead = new AbortController();
  await assert.rejects(() => readVoiceRecording(async () => ({ ok: true, arrayBuffer: async () => {
    duringRead.abort(); return new ArrayBuffer(100);
  } }), "file:///clip.m4a", duringRead.signal), { code: "VOICE_READ_FAILED" });
});
