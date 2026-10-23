import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Buffer } from "node:buffer";
import { getFunctionName } from "convex/server";
import { convexToJson, jsonToConvex } from "convex/values";
import { streamWebhook } from "../convex/http.js";
import { processWebhook } from "../convex/streamCalls.js";
import { applyEvent, expire } from "../convex/calls.js";

const secret = "test-webhook-secret-not-a-real-credential";
const signature = bytes => createHmac("sha256", secret).update(bytes).digest("hex");
function harness() {
  const call = { _id: "call", streamCallId: "test-call", callerId: "caller", receiverId: "receiver",
    status: "ringing", createdAt: Date.now() - 29000, ringDeadline: Date.now() - 1, provisioned: true };
  const effects = { mutations: 0, cleanup: [], raw: null };
  const ctx = {
    db: { query: () => ({ withIndex(name, fn) {
      const builder = { eq(field, value) { assert.equal(field, "streamCallId"); assert.equal(value, call.streamCallId); return builder; } };
      fn(builder); return this;
    }, unique: async () => ({ ...call }) }),
    get: async () => ({ ...call }), patch: async (table, id, patch) => Object.assign(call, patch) },
    scheduler: { runAfter: async (...args) => effects.cleanup.push(args) },
    runMutation: async (ref, args) => {
      assert.equal(getFunctionName(ref), "calls:applyEvent"); effects.mutations++;
      return applyEvent._handler(ctx, args);
    },
    runAction: async (ref, args) => {
      assert.equal(getFunctionName(ref), "streamCalls:processWebhook");
      assert.ok(args.body instanceof ArrayBuffer); effects.raw = Buffer.from(args.body);
      // Exercise the actual Convex bytes serialization boundary too.
      return processWebhook._handler(ctx, jsonToConvex(convexToJson(args)));
    },
  };
  const deliver = async (event, { compressed = false, corruptSignature = false, chunked = false, bytes } = {}) => {
    const json = bytes ?? Buffer.from(JSON.stringify(event));
    const body = compressed ? gzipSync(json) : json;
    const headers = { "x-signature": corruptSignature ? "0".repeat(64) : signature(json), "content-type": "application/json" };
    const input = chunked ? new ReadableStream({ start(controller) {
      for (let offset = 0; offset < body.length; offset += 7) controller.enqueue(body.subarray(offset, offset + 7));
      controller.close();
    } }) : body;
    const request = new Request("https://test/stream/webhook", { method: "POST", body: input, headers, ...(chunked ? { duplex: "half" } : {}) });
    const previousKey = process.env.STREAM_API_KEY, previousSecret = process.env.STREAM_API_SECRET;
    process.env.STREAM_API_KEY = "test-key"; process.env.STREAM_API_SECRET = secret;
    try { return await streamWebhook._handler(ctx, request); }
    finally {
      if (previousKey === undefined) delete process.env.STREAM_API_KEY; else process.env.STREAM_API_KEY = previousKey;
      if (previousSecret === undefined) delete process.env.STREAM_API_SECRET; else process.env.STREAM_API_SECRET = previousSecret;
    }
  };
  const event = type => ({ type, call_cid: "saflal_audio:test-call", user: { id: "receiver", name: "\u0627\u062a\u0635\u0627\u0644" }, created_at: new Date().toISOString() });
  return { ctx, call, effects, deliver, event };
}

test("plain and chunked gzip Stream callbacks pass real SDK verification without changing signed bytes", async () => {
  for (const compressed of [false, true]) {
    const h = harness(), event = h.event("call.accepted");
    assert.equal((await h.deliver(event, { compressed, chunked: true })).status, 204);
    assert.equal(h.call.status, "accepted"); assert.equal(h.effects.mutations, 1);
    if (compressed) assert.deepEqual([...h.effects.raw.subarray(0, 2)], [0x1f, 0x8b]);
  }
});
test("accepted/joined callbacks protect the call from ringing expiry and delayed missed events", async () => {
  const h = harness();
  assert.equal((await h.deliver(h.event("call.accepted"), { compressed: true })).status, 204);
  const joined = { ...h.event("call.session_participant_joined"), participant: { user: { id: "receiver" } } };
  assert.equal((await h.deliver(joined, { compressed: true })).status, 204);
  assert.ok(h.call.startedAt); assert.equal(h.call.status, "accepted");
  await expire._handler(h.ctx, { callId: "call" });
  assert.equal((await h.deliver(h.event("call.missed"), { compressed: true })).status, 204);
  assert.equal(h.call.status, "accepted"); assert.equal(h.effects.cleanup.length, 0);
});
test("unsigned, forged and malformed callbacks cannot mutate calls", async () => {
  const h = harness();
  assert.equal((await streamWebhook._handler(h.ctx, new Request("https://test/stream/webhook", { method: "POST", body: "{}" }))).status, 401);
  for (const compressed of [false, true]) {
    assert.equal((await h.deliver(h.event("call.accepted"), { compressed, corruptSignature: true })).status, 401);
  }
  assert.equal((await h.deliver(null, { bytes: Buffer.from("not json"), compressed: true })).status, 401);
  assert.equal(h.call.status, "ringing"); assert.equal(h.effects.mutations, 0);
});
test("raw and decompressed payload limits reject oversized data before any database mutation", async () => {
  const h = harness(), bytes = Buffer.from(JSON.stringify({ ...h.event("call.accepted"), custom: "x".repeat(300 * 1024) }));
  assert.equal((await h.deliver(null, { bytes })).status, 413);
  assert.equal((await h.deliver(null, { bytes, compressed: true })).status, 401);
  assert.equal(h.effects.mutations, 0);
});
