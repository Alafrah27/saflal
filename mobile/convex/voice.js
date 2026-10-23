// @ts-check
import { ConvexError, v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireUser } from "./auth.js";
import { loadChat } from "./chats.js";
import { canSend } from "./messages.js";
import { messageVisible } from "./lib/historyVisibility.js";
import { UPLOAD_TTL, VOICE_STORAGE_TYPE, validMessageKey } from "./lib/voicePolicy.js";
import { deleteUnreferencedAudio as deleteUnreferenced } from "./lib/voiceStorage.js";

/** @typedef {import("./_generated/server.js").MutationCtx} MutationCtx */
/** @typedef {import("./_generated/server.js").QueryCtx} QueryCtx */
/** @template {import("./_generated/dataModel.js").TableNames | "_storage"} T @typedef {import("./_generated/dataModel.js").Id<T>} Id */

/** @param {MutationCtx | QueryCtx} ctx @param {Id<"chats">} chatId */
export async function requireVoiceChat(ctx, chatId) {
  const user = await requireUser(ctx);
  const loaded = await loadChat(ctx, chatId, user._id);
  if (!loaded || !await canSend(ctx, user._id, loaded)) throw new ConvexError("CHAT_UNAVAILABLE");
  return { user, loaded };
}

/** @param {MutationCtx} ctx @param {Id<"audioUploads">} uploadId */
async function ownedUpload(ctx, uploadId) {
  const user = await requireUser(ctx);
  const upload = await ctx.db.get("audioUploads", uploadId);
  if (!upload || upload.ownerId !== user._id) throw new ConvexError("UPLOAD_UNAVAILABLE");
  return upload;
}

export const beginAudioUpload = mutation({
  args: { chatId: v.id("chats"), clientMessageId: v.string() },
  returns: v.object({ uploadId: v.id("audioUploads") }),
  handler: async (ctx, { chatId, clientMessageId }) => {
    const { user } = await requireVoiceChat(ctx, chatId);
    if (!validMessageKey(clientMessageId)) throw new ConvexError("INVALID_MESSAGE_KEY");
    const previous = await ctx.db.query("audioUploads").withIndex("by_owner_key", q =>
      q.eq("ownerId", user._id).eq("clientMessageId", clientMessageId)).unique();
    if (previous) {
      if (previous.chatId !== chatId) throw new ConvexError("MESSAGE_KEY_REUSED");
      if (previous.expiresAt <= Date.now()) throw new ConvexError("UPLOAD_EXPIRED");
      return { uploadId: previous._id };
    }
    let count = 0;
    for (const status of /** @type {const} */ (["pending", "uploading", "ready"])) {
      const rows = await ctx.db.query("audioUploads").withIndex("by_owner_status", q =>
        q.eq("ownerId", user._id).eq("status", status)).take(4);
      // Expired sessions count until bounded cleanup reclaims them; fail closed.
      count += rows.length;
    }
    if (count >= 3) throw new ConvexError("UPLOAD_LIMIT");
    const now = Date.now();
    const uploadId = await ctx.db.insert("audioUploads", { ownerId: user._id, chatId, clientMessageId,
      status: "pending", createdAt: now, expiresAt: now + UPLOAD_TTL });
    return { uploadId };
  },
});

export const cancelAudioUpload = mutation({
  args: { uploadId: v.id("audioUploads") }, returns: v.null(),
  handler: async (ctx, { uploadId }) => {
    const upload = await ownedUpload(ctx, uploadId);
    if (upload.status !== "consumed") {
      await deleteUnreferenced(ctx, upload.storageId);
      // Keep the operation tombstone so an in-flight POST cannot attach later.
      await ctx.db.patch("audioUploads", uploadId, { status: "pending", storageId: undefined,
        audioDuration: undefined, lease: undefined, leaseUntil: undefined, expiresAt: Date.now() });
    }
    return null;
  },
});

export const claimUpload = internalMutation({
  args: { uploadId: v.id("audioUploads"), lease: v.string() },
  returns: v.object({ ready: v.boolean() }),
  handler: async (ctx, { uploadId, lease }) => {
    const upload = await ownedUpload(ctx, uploadId);
    await requireVoiceChat(ctx, upload.chatId);
    if (upload.expiresAt <= Date.now()) throw new ConvexError("UPLOAD_EXPIRED");
    if (upload.status === "ready" || upload.status === "consumed") return { ready: true };
    if (upload.status === "uploading" && (upload.leaseUntil ?? 0) > Date.now()) throw new ConvexError("UPLOAD_BUSY");
    await deleteUnreferenced(ctx, upload.storageId);
    await ctx.db.patch("audioUploads", uploadId, { status: "uploading", lease, leaseUntil: Date.now() + 10 * 60 * 1000,
      storageId: undefined, audioDuration: undefined });
    return { ready: false };
  },
});

export const attachUpload = internalMutation({
  args: { uploadId: v.id("audioUploads"), lease: v.string(), storageId: v.id("_storage") }, returns: v.null(),
  handler: async (ctx, { uploadId, lease, storageId }) => {
    const upload = await ownedUpload(ctx, uploadId);
    if (upload.status !== "uploading" || upload.lease !== lease || (upload.leaseUntil ?? 0) <= Date.now() || upload.expiresAt <= Date.now() || upload.storageId) {
      throw new ConvexError("UPLOAD_UNAVAILABLE");
    }
    await ctx.db.patch("audioUploads", uploadId, { storageId }); return null;
  },
});

export const finishUpload = internalMutation({
  args: { uploadId: v.id("audioUploads"), lease: v.string(), storageId: v.id("_storage"), duration: v.number() }, returns: v.null(),
  handler: async (ctx, { uploadId, lease, storageId, duration }) => {
    const upload = await ownedUpload(ctx, uploadId);
    await requireVoiceChat(ctx, upload.chatId);
    if (upload.status !== "uploading" || upload.lease !== lease || upload.storageId !== storageId ||
      (upload.leaseUntil ?? 0) <= Date.now() || upload.expiresAt <= Date.now() || !Number.isFinite(duration) || duration < 1 || duration > 300) throw new ConvexError("INVALID_AUDIO");
    await ctx.db.patch("audioUploads", uploadId, { status: "ready", audioDuration: duration,
      lease: undefined, leaseUntil: undefined }); return null;
  },
});

export const failUpload = internalMutation({
  args: { uploadId: v.id("audioUploads"), lease: v.string() }, returns: v.null(),
  handler: async (ctx, { uploadId, lease }) => {
    const upload = await ownedUpload(ctx, uploadId);
    if (upload.status === "uploading" && upload.lease === lease) {
      await deleteUnreferenced(ctx, upload.storageId);
      await ctx.db.patch("audioUploads", uploadId, { status: "pending", storageId: undefined,
        lease: undefined, leaseUntil: undefined });
    }
    return null;
  },
});

export const getAudioFile = internalQuery({
  args: { messageId: v.id("messages") }, returns: v.id("_storage"),
  handler: async (ctx, { messageId }) => {
    const user = await requireUser(ctx);
    const message = await ctx.db.get("messages", messageId);
    const loaded = message && await loadChat(ctx, message.chatId, user._id);
    if (!message || "deletedAt" in message || message.type !== "audio" || (message.expiresAt !== undefined && message.expiresAt <= Date.now()) ||
      !loaded || !messageVisible(message, loaded.membership)) throw new ConvexError("AUDIO_UNAVAILABLE");
    return message.audioStorageId;
  },
});

export const cleanup = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const uploads = await ctx.db.query("audioUploads").withIndex("by_expires_at", q => q.lte("expiresAt", Date.now())).take(25);
    for (const upload of uploads) {
      await deleteUnreferenced(ctx, upload.storageId);
      await ctx.db.delete("audioUploads", upload._id);
    }
    if (uploads.length === 25) await ctx.scheduler.runAfter(0, internal.voice.cleanup, {});
    return null;
  },
});

// Scan only metadata in bounded pages. The unique MIME marker protects files
// created by other features, including every historical untagged attachment.
export const sweepOrphans = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.system.query("_storage").paginate({ numItems: 25, cursor });
    for (const file of page.page) {
      if (file.contentType !== VOICE_STORAGE_TYPE || file._creationTime > Date.now() - UPLOAD_TTL) continue;
      const upload = await ctx.db.query("audioUploads").withIndex("by_storage", q => q.eq("storageId", file._id)).first();
      const message = await ctx.db.query("messages").withIndex("by_audio_storage", q => q.eq("audioStorageId", file._id)).first();
      if (!upload && !message) await ctx.storage.delete(file._id);
      else if (message?.expiresAt !== undefined && message.expiresAt <= Date.now()) {
        await ctx.storage.delete(file._id); // Keep expired history metadata; reads already exclude it.
      }
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.voice.sweepOrphans, { cursor: page.continueCursor });
    return null;
  },
});
