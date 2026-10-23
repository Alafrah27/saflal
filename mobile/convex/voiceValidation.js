// @ts-check
"use node";

import { v } from "convex/values";
import { parseBuffer } from "music-metadata";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "./lib/voicePolicy.js";

/** @param {Blob | null} blob */
export async function inspectVoice(blob) {
  if (!blob || blob.size < 32 || blob.size > MAX_VOICE_BYTES) throw Error("INVALID_AUDIO");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(4, 8)) !== "ftyp") throw Error("INVALID_AUDIO");
  // Reject truncated/overrunning top-level boxes even if a metadata parser can
  // recover a plausible duration from an earlier moov header.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0, media = false, movie = false;
  while (offset < bytes.length) {
    if (bytes.length - offset < 8) throw Error("INVALID_AUDIO");
    const kind = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    let size = view.getUint32(offset), header = 8;
    if (size === 1) {
      if (bytes.length - offset < 16) throw Error("INVALID_AUDIO");
      size = Number(view.getBigUint64(offset + 8)); header = 16;
    } else if (size === 0) size = bytes.length - offset;
    if (!Number.isSafeInteger(size) || size < header || offset + size > bytes.length) throw Error("INVALID_AUDIO");
    if (kind === "mdat" && size > header) media = true;
    if (kind === "moov") movie = true;
    offset += size;
  }
  if (!media || !movie) throw Error("INVALID_AUDIO");
  const metadata = await parseBuffer(bytes, { mimeType: "audio/mp4", size: bytes.length }, { duration: true, skipCovers: true });
  const format = metadata.format;
  const duration = format.duration;
  const tracks = format.trackInfo ?? [];
  if (!format.container?.match(/M4A|MP4|isom/i) || !format.codec?.match(/AAC/i) || format.hasVideo || !format.hasAudio ||
    tracks.length !== 1 || tracks.some(track => track.type !== 2 || !track.codecName?.match(/AAC/i)) || typeof duration !== "number" || !Number.isFinite(duration) ||
    duration < 1 || duration > MAX_VOICE_SECONDS || !format.numberOfChannels || format.numberOfChannels > 2) {
    throw Error("INVALID_AUDIO");
  }
  return duration;
}

export const validate = internalAction({
  args: { uploadId: v.id("audioUploads"), lease: v.string(), storageId: v.id("_storage") }, returns: v.null(),
  handler: async (ctx, args) => {
    const duration = await inspectVoice(await ctx.storage.get(args.storageId));
    await ctx.runMutation(internal.voice.finishUpload, { ...args, duration });
    return null;
  },
});
