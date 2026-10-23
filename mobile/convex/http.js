// @ts-check
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { readVoiceBody } from "./lib/voicePolicy.js";

const http = httpRouter();
const unavailable = () => new Response("Voice message unavailable. Please try again.", {
  status: 400, headers: { "Cache-Control": "private, no-store" },
});

export const uploadVoice = httpAction(async (ctx, request) => {
  if (!await ctx.auth.getUserIdentity()) return new Response(null, { status: 401 });
  // Convex's internal mutation validator remains the runtime ID authority.
  const uploadId = /** @type {import("./_generated/dataModel.js").Id<"audioUploads"> | null} */ (new URL(request.url).searchParams.get("uploadId"));
  if (!uploadId) return unavailable();
  const lease = `${Date.now()}-${Math.random()}`;
  let claimed = false, storageId = null, attached = false;
  try {
    const result = await ctx.runMutation(internal.voice.claimUpload, { uploadId, lease });
    if (result.ready) return new Response(null, { status: 204 });
    claimed = true;
    const blob = await readVoiceBody(request);
    storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.voice.attachUpload, { uploadId, lease, storageId });
    attached = true;
    await ctx.runAction(internal.voiceValidation.validate, { uploadId, lease, storageId });
    return new Response(null, { status: 204 });
  } catch {
    if (storageId && !attached) await ctx.storage.delete(storageId).catch(() => {});
    if (claimed) await ctx.runMutation(internal.voice.failUpload, { uploadId, lease }).catch(() => {});
    return unavailable();
  }
});

export const downloadVoice = httpAction(async (ctx, request) => {
  if (!await ctx.auth.getUserIdentity()) return new Response(null, { status: 401 });
  try {
    const messageId = /** @type {import("./_generated/dataModel.js").Id<"messages">} */ (new URL(request.url).pathname.slice("/voice/".length));
    const storageId = await ctx.runQuery(internal.voice.getAudioFile, { messageId });
    const blob = await ctx.storage.get(storageId);
    if (!blob) return unavailable();
    const headers = { "Content-Type": "audio/mp4", "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes", "Content-Length": String(blob.size) };
    const range = request.headers.get("Range");
    if (!range) return new Response(blob, { headers });
    // Native audio players request byte ranges to load and seek M4A recordings.
    // Authorization/expiration above applies to every range request too.
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalidRange = () => new Response(null, { status: 416,
      headers: { "Content-Range": `bytes */${blob.size}`, "Cache-Control": "private, no-store" } });
    if (!match || (!match[1] && !match[2])) return invalidRange();
    const start = match[1] ? Number(match[1]) : Math.max(0, blob.size - Number(match[2]));
    const requestedEnd = match[1] && match[2] ? Number(match[2]) : blob.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= blob.size ||
      requestedEnd < start || (!match[1] && (!Number.isSafeInteger(Number(match[2])) || Number(match[2]) <= 0))) return invalidRange();
    const end = Math.min(requestedEnd, blob.size - 1);
    return new Response(blob.slice(start, end + 1, "audio/mp4"), { status: 206, headers: {
      ...headers, "Content-Range": `bytes ${start}-${end}/${blob.size}`, "Content-Length": String(end - start + 1),
    } });
  } catch { return unavailable(); }
});

http.route({ path: "/voice/upload", method: "POST", handler: uploadVoice });
http.route({ pathPrefix: "/voice/", method: "GET", handler: downloadVoice });
export const streamWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("x-signature");
  if (!signature || signature.length > 512) return new Response(null, { status: 401 });
  // Bounded raw bytes are preserved for signature validation, before JSON parsing.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 256 * 1024) { await reader.cancel(); return new Response(null, { status: 413 }); }
    chunks.push(value);
  }
    // Preserve binary gzip payloads as bytes. Decoding compressed data as UTF-8
    // corrupts it before Stream can decompress and verify the signed JSON.
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const valid = await ctx.runAction(internal.streamCalls.processWebhook, { body: body.buffer, signature });
  return new Response(null, { status: valid ? 204 : 401 });
});
http.route({ path: "/stream/webhook", method: "POST", handler: streamWebhook });
export default http;
