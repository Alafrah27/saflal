import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { getFunctionName } from "convex/server";
import * as voice from "../convex/voice.js";
import { sendAudio } from "../convex/messages.js";
import { inspectVoice } from "../convex/voiceValidation.js";
import { uploadVoice, downloadVoice } from "../convex/http.js";
import { MAX_VOICE_BYTES, UPLOAD_TTL, VOICE_STORAGE_TYPE, readVoiceBody } from "../convex/lib/voicePolicy.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

const key = "voice-operation-key-0001";
const sample = readFileSync(new URL("./fixtures/voice-sample.m4a", import.meta.url));
const video = readFileSync(new URL("./fixtures/video-sample.mp4", import.meta.url));
async function fixture() {
  const f = pushFixture();
  const seed = await f.message(); const chatId = f.rows.messages.find(row => row._id === seed).chatId;
  f.rows.messages.length = 0;
  await f.ctx.db.insert("friendships", { user1Id: "a", user2Id: "b", createdAt: 1 });
  const files = new Map(), deleted = [];
  f.ctx.storage = {
    get: async id => files.get(id)?.blob ?? null,
    store: async blob => { const id = `file_${files.size}`; files.set(id, { _id: id, _creationTime: Date.now(), contentType: blob.type, size: blob.size, blob }); return id; },
    delete: async id => { files.delete(id); deleted.push(id); },
  };
  f.ctx.db.system = {
    get: async (table, id) => files.get(id) ?? null,
    query: () => ({ paginate: async () => ({ page: [...files.values()].slice(0, 25), isDone: true, continueCursor: "" }) }),
  };
  f.ctx.runMutation = async (ref, args) => {
    const handlers = { claimUpload: voice.claimUpload, attachUpload: voice.attachUpload, finishUpload: voice.finishUpload,
      failUpload: voice.failUpload, getAudioFile: voice.getAudioFile };
    const name = getFunctionName(ref).split(":")[1]; return handlers[name]._handler(f.ctx, args);
  };
  f.ctx.runQuery = f.ctx.runMutation;
  f.ctx.runAction = async (ref, args) => {
    const duration = await inspectVoice(await f.ctx.storage.get(args.storageId));
    await voice.finishUpload._handler(f.ctx, { ...args, duration });
  };
  const begin = (clientMessageId = key) => voice.beginAudioUpload._handler(f.ctx, { chatId, clientMessageId });
  const ready = async () => {
    const { uploadId } = await begin();
    await voice.claimUpload._handler(f.ctx, { uploadId, lease: "lease" });
    const storageId = await f.ctx.storage.store(new Blob([sample], { type: VOICE_STORAGE_TYPE }));
    await voice.attachUpload._handler(f.ctx, { uploadId, lease: "lease", storageId });
    await voice.finishUpload._handler(f.ctx, { uploadId, lease: "lease", storageId, duration: await inspectVoice(new Blob([sample])) });
    return uploadId;
  };
  return { ...f, chatId, files, deleted, begin, ready,
    send: uploadId => sendAudio._handler(f.ctx, { chatId, uploadId, clientMessageId: key }) };
}

test("real M4A AAC metadata determines duration; video, wrong format, empty, corrupt and oversized files fail", async () => {
  assert.equal(await inspectVoice(new Blob([sample])), 1.024);
  for (const blob of [new Blob([video]), new Blob(["not audio"]), new Blob(), new Blob([sample.subarray(0, 40)]),
    new Blob([sample.subarray(0, sample.length - 20)]), new Blob([new Uint8Array(MAX_VOICE_BYTES + 1)])]) {
    await assert.rejects(() => inspectVoice(blob));
  }
  const tooLong = Buffer.from(sample);
  const mdhd = tooLong.indexOf(Buffer.from("mdhd"));
  assert.ok(mdhd > 0); tooLong.writeUInt32BE(48000 * 301, mdhd + 20);
  await assert.rejects(() => inspectVoice(new Blob([tooLong])));
});

test("streaming upload limit applies without Content-Length and cancels oversized bodies", async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_VOICE_BYTES)); c.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } });
  await assert.rejects(() => readVoiceBody({ body }), /AUDIO_TOO_LARGE/); assert.equal(cancelled, true);
  assert.equal((await readVoiceBody(new Request("https://test", { method: "POST", body: sample }))).type, VOICE_STORAGE_TYPE);
});

test("only authorized friends create uploads; keys bind owner/chat and outstanding uploads are capped at three", async () => {
  const f = await fixture(); const first = await f.begin();
  assert.deepEqual(await f.begin(), first);
  for (const id of ["voice-operation-key-0002", "voice-operation-key-0003"]) await f.begin(id);
  await assert.rejects(() => f.begin("voice-operation-key-0004"), /UPLOAD_LIMIT/);
  for (const actor of ["c", null]) { f.as(actor); await assert.rejects(() => f.begin()); }
  f.as("a"); await assert.rejects(() => f.begin("bad"), /INVALID_MESSAGE_KEY/);
});

test("pending/declined relationships and blocking in either direction deny begin and send without a message", async () => {
  for (const reason of ["pending", "rejected", "block_a", "block_b"]) {
    const f = await fixture(), uploadId = await f.ready();
    if (reason.startsWith("block")) await f.ctx.db.insert("blockedUsers", { blockerId: reason === "block_a" ? "a" : "b", blockedId: reason === "block_a" ? "b" : "a", createdAt: 1 });
    else { f.rows.friendships.length = 0; await f.request({ status: reason }); }
    await assert.rejects(f.begin, /CHAT_UNAVAILABLE/); await assert.rejects(() => f.send(uploadId), /CHAT_UNAVAILABLE/);
    assert.equal(f.rows.messages.length, 0);
  }
});

test("upload lease prevents concurrent POSTs and stale completion cannot attach after cancellation", async () => {
  const f = await fixture(), { uploadId } = await f.begin();
  f.as("b"); await assert.rejects(() => voice.claimUpload._handler(f.ctx, { uploadId, lease: "stolen" })); f.as("a");
  await voice.claimUpload._handler(f.ctx, { uploadId, lease: "one" });
  await assert.rejects(() => voice.claimUpload._handler(f.ctx, { uploadId, lease: "two" }), /UPLOAD_BUSY/);
  await voice.cancelAudioUpload._handler(f.ctx, { uploadId });
  await assert.rejects(() => voice.attachUpload._handler(f.ctx, { uploadId, lease: "one", storageId: "forged" }));
});

test("audio commit is authenticated, idempotent, updates chat and enqueues exactly one push", async () => {
  const f = await fixture(), uploadId = await f.ready(); await f.device();
  const first = await f.send(uploadId), writes = f.writes.length;
  assert.deepEqual(await f.send(uploadId), first); assert.equal(f.writes.length, writes);
  assert.equal(f.rows.messages.length, 1); assert.equal(f.rows.messages[0].type, "audio");
  assert.equal(f.rows.messages[0].audioDuration, 1.024); assert.equal(f.rows.messages[0].senderId, "a");
  assert.equal(f.rows.chats[0].lastMessageId, first.messageId); assert.equal(f.rows.audioUploads[0].status, "consumed");
  assert.equal(f.rows.pushDeliveries.length, 1);
  await voice.cancelAudioUpload._handler(f.ctx, { uploadId }); assert.equal(f.deleted.length, 0);
});

test("forged upload IDs, sender changes, unverified uploads, and key reuse never grant send access", async () => {
  const f = await fixture(), { uploadId } = await f.begin();
  await assert.rejects(() => f.send(uploadId)); await assert.rejects(() => f.send("forged"));
  await f.ready(); f.as("b"); await assert.rejects(() => f.send(uploadId)); f.as("a");
  f.rows.audioUploads[0].clientMessageId = "different-operation-key"; await assert.rejects(() => f.send(uploadId));
  f.rows.audioUploads[0].clientMessageId = key;
  f.rows.messages.push({ _id: "conflict", chatId: f.chatId, senderId: "a", clientMessageId: key, type: "text", text: "different" });
  await assert.rejects(() => f.send(uploadId), /MESSAGE_KEY_REUSED/);
});

test("audio uses the existing 30-day policy and expired/unowned messages cannot be downloaded", async () => {
  const f = await fixture(), uploadId = await f.ready(); f.rows.chats[0].disappearingMessages = true;
  const { messageId } = await f.send(uploadId), row = f.rows.messages[0];
  assert.equal(row.expiresAt - row.createdAt, 30 * 24 * 60 * 60 * 1000);
  f.as("b"); assert.equal(await voice.getAudioFile._handler(f.ctx, { messageId }), row.audioStorageId);
  await f.ctx.db.insert("blockedUsers", { blockerId: "b", blockedId: "a", createdAt: 1 });
  f.rows.friendships.length = 0; assert.equal(await voice.getAudioFile._handler(f.ctx, { messageId }), row.audioStorageId);
  for (const actor of ["c", null]) { f.as(actor); await assert.rejects(() => voice.getAudioFile._handler(f.ctx, { messageId })); }
  f.as("a"); row.expiresAt = Date.now() - 1; await assert.rejects(() => voice.getAudioFile._handler(f.ctx, { messageId }));
});

test("HTTP upload validates file bytes and authenticated playback returns private bytes, never a public URL", async () => {
  const f = await fixture(), { uploadId } = await f.begin();
  const request = () => new Request(`https://test/voice/upload?uploadId=${uploadId}`, { method: "POST", body: sample });
  assert.equal((await uploadVoice._handler(f.ctx, request())).status, 204);
  assert.equal((await uploadVoice._handler(f.ctx, request())).status, 204); assert.equal(f.files.size, 1);
  const { messageId } = await f.send(uploadId);
  const download = () => downloadVoice._handler(f.ctx, new Request(`https://test/voice/${messageId}`));
  const response = await download(); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), sample);
  f.as("c"); assert.equal((await download()).status, 400); f.as(null); assert.equal((await download()).status, 401);
});

test("invalid HTTP uploads delete staged files, permit retry, and have no messaging side effects", async () => {
  const f = await fixture(), { uploadId } = await f.begin();
  const response = await uploadVoice._handler(f.ctx, new Request(`https://test/voice/upload?uploadId=${uploadId}`, { method: "POST", body: video }));
  assert.equal(response.status, 400); assert.equal(f.files.size, 0); assert.equal(f.rows.audioUploads[0].status, "pending");
  assert.equal(f.rows.messages.length, 0); assert.equal(f.rows.pushDeliveries.length, 0);
});

test("native playback byte ranges support seeking and keep membership/expiration checks", async () => {
  const f = await fixture(), uploadId = await f.ready(), { messageId } = await f.send(uploadId);
  const download = range => downloadVoice._handler(f.ctx,
    new Request(`https://test/voice/${messageId}`, { headers: { Range: range } }));
  for (const [range, start, end] of [["bytes=0-1", 0, 1], ["bytes=10-", 10, sample.length - 1],
    ["bytes=-16", sample.length - 16, sample.length - 1], ["bytes=0-999999", 0, sample.length - 1]]) {
    const response = await download(range);
    assert.equal(response.status, 206); assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${sample.length}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("content-length"), String(end - start + 1));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), sample.subarray(start, end + 1));
  }
  for (const range of ["bytes=-0", "bytes=8-3", "bytes=999999-", "bytes=0-1,3-4", "bytes=-", "not-a-range"]) {
    assert.equal((await download(range)).status, 416);
  }
  f.as("c"); assert.equal((await download("bytes=0-1")).status, 400);
  f.as(null); assert.equal((await download("bytes=0-1")).status, 401);
  f.as("a"); f.rows.messages[0].expiresAt = Date.now() - 1;
  assert.equal((await download("bytes=0-1")).status, 400);
});

test("cleanup deletes abandoned/tagged or expired audio, preserves committed audio and unrelated files", async () => {
  const f = await fixture(), uploadId = await f.ready(); await f.send(uploadId);
  const committed = f.rows.messages[0].audioStorageId;
  for (const file of f.files.values()) file._creationTime -= UPLOAD_TTL * 2;
  const orphan = await f.ctx.storage.store(new Blob([sample], { type: VOICE_STORAGE_TYPE })); f.files.get(orphan)._creationTime -= UPLOAD_TTL * 2;
  const unrelated = await f.ctx.storage.store(new Blob([sample], { type: "audio/mp4" })); f.files.get(unrelated)._creationTime -= UPLOAD_TTL * 2;
  f.rows.audioUploads[0].expiresAt = 1;
  await voice.cleanup._handler(f.ctx, {}); assert.equal(f.files.has(committed), true);
  await voice.sweepOrphans._handler(f.ctx, { cursor: null });
  assert.equal(f.files.has(orphan), false); assert.equal(f.files.has(committed), true); assert.equal(f.files.has(unrelated), true);
  f.rows.messages[0].expiresAt = 1; await voice.sweepOrphans._handler(f.ctx, { cursor: null });
  assert.equal(f.files.has(committed), false); assert.equal(f.files.has(unrelated), true);
});
