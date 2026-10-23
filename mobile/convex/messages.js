// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { areFriends, loadChat, recordChatActivity } from "./chats.js";
import { messageRead, messageVisible } from "./lib/historyVisibility.js";
import { hasBlockingRelationship } from "./lib/blocking.js";
import { enqueueMessagePush } from "./lib/push.js";
import { MAX_VOICE_BYTES, VOICE_STORAGE_TYPE } from "./lib/voicePolicy.js";
import { messageContent } from "./lib/messageContent.js";
import { deleteUnreferencedAudio } from "./lib/voiceStorage.js";

/** @typedef {import("./_generated/server.js").QueryCtx} QueryCtx */
/** @typedef {import("./_generated/dataModel.js").Id<"users">} UserId */
/** @typedef {NonNullable<Awaited<ReturnType<typeof loadChat>>>} LoadedChat */

/** @param {QueryCtx} ctx @param {UserId} userId @param {LoadedChat} loaded */
export async function canSend(ctx, userId, loaded) {
  const peer = await ctx.db.get("users", loaded.peerId);
  return !!peer?.isActive && await areFriends(ctx, userId, loaded.peerId) &&
    !await hasBlockingRelationship(ctx, userId, loaded.peerId);
}

export const getSendPermission = query({
  args: { chatId: v.id("chats") }, returns: v.boolean(),
  handler: async (ctx, { chatId }) => {
    const user = await requireUser(ctx);
    const loaded = await loadChat(ctx, chatId, user._id);
    if (!loaded) throw new ConvexError("CHAT_UNAVAILABLE");
    return await canSend(ctx, user._id, loaded);
  },
});

export const sendText = mutation({
  args: { chatId: v.id("chats"), text: v.string(), clientMessageId: v.string() },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, { chatId, text, clientMessageId }) => {
    const user = await requireUser(ctx);
    const body = text.trim();
    if (!body || text.length > 4000) throw new ConvexError("INVALID_MESSAGE_TEXT");
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(clientMessageId)) throw new ConvexError("INVALID_MESSAGE_KEY");
    const loaded = await loadChat(ctx, chatId, user._id);
    if (!loaded || !await canSend(ctx, user._id, loaded)) throw new ConvexError("CHAT_UNAVAILABLE");
    const previous = await ctx.db.query("messages").withIndex("by_chat_sender_client", q =>
      q.eq("chatId", chatId).eq("senderId", user._id).eq("clientMessageId", clientMessageId)).unique();
    if (previous) {
      if (previous.type !== "text" || (!("deletedAt" in previous) && previous.text !== body)) throw new ConvexError("MESSAGE_KEY_REUSED");
      return { messageId: previous._id };
    }
    const now = Math.max(Date.now(), loaded.chat.lastMessageAt ?? 0,
      loaded.membership.clearedThrough?.createdAt ?? 0, loaded.peerMembership.clearedThrough?.createdAt ?? 0);
    const messageId = await ctx.db.insert("messages", {
      chatId, senderId: user._id, clientMessageId, type: "text", text: body,
      status: "sent", createdAt: now, updatedAt: now,
      ...(loaded.chat.disappearingMessages ? { expiresAt: now + 30 * 24 * 60 * 60 * 1000 } : {}),
    });
    await recordChatActivity(ctx, loaded, messageId, now);
    await enqueueMessagePush(ctx, { messageId });
    return { messageId };
  },
});

export const sendAudio = mutation({
  args: { chatId: v.id("chats"), uploadId: v.id("audioUploads"), clientMessageId: v.string() },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, { chatId, uploadId, clientMessageId }) => {
    const user = await requireUser(ctx);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(clientMessageId)) throw new ConvexError("INVALID_MESSAGE_KEY");
    const loaded = await loadChat(ctx, chatId, user._id);
    if (!loaded || !await canSend(ctx, user._id, loaded)) throw new ConvexError("CHAT_UNAVAILABLE");
    const previous = await ctx.db.query("messages").withIndex("by_chat_sender_client", q =>
      q.eq("chatId", chatId).eq("senderId", user._id).eq("clientMessageId", clientMessageId)).unique();
    // The upload may already have been reclaimed. Never resurrect a deleted send.
    if (previous && "deletedAt" in previous) {
      if (previous.type !== "audio") throw new ConvexError("MESSAGE_KEY_REUSED");
      return { messageId: previous._id };
    }
    const upload = await ctx.db.get("audioUploads", uploadId);
    if (!upload || upload.ownerId !== user._id || upload.chatId !== chatId || upload.clientMessageId !== clientMessageId) {
      throw new ConvexError("UPLOAD_UNAVAILABLE");
    }
    if (previous) {
      if (previous.type !== "audio" || previous.audioStorageId !== upload.storageId) throw new ConvexError("MESSAGE_KEY_REUSED");
      return { messageId: previous._id };
    }
    if (upload.status !== "ready" || upload.expiresAt <= Date.now() || !upload.storageId ||
      typeof upload.audioDuration !== "number" || !Number.isFinite(upload.audioDuration) || upload.audioDuration < 1 || upload.audioDuration > 300) throw new ConvexError("UPLOAD_UNAVAILABLE");
    const file = await ctx.db.system.get("_storage", upload.storageId);
    if (!file || file.size < 32 || file.size > MAX_VOICE_BYTES || file.contentType !== VOICE_STORAGE_TYPE) throw new ConvexError("AUDIO_UNAVAILABLE");
    const now = Math.max(Date.now(), loaded.chat.lastMessageAt ?? 0,
      loaded.membership.clearedThrough?.createdAt ?? 0, loaded.peerMembership.clearedThrough?.createdAt ?? 0);
    const messageId = await ctx.db.insert("messages", {
      chatId, senderId: user._id, clientMessageId, type: "audio", audioStorageId: upload.storageId,
      audioDuration: upload.audioDuration, status: "sent", createdAt: now, updatedAt: now,
      ...(loaded.chat.disappearingMessages ? { expiresAt: now + 30 * 24 * 60 * 60 * 1000 } : {}),
    });
    await ctx.db.patch("audioUploads", uploadId, { status: "consumed" });
    await recordChatActivity(ctx, loaded, messageId, now);
    await enqueueMessagePush(ctx, { messageId });
    return { messageId };
  },
});

export const deleteForEveryone = mutation({
  args: { messageId: v.id("messages") }, returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const user = await requireUser(ctx);
    const message = await ctx.db.get("messages", messageId);
    const loaded = message && await loadChat(ctx, message.chatId, user._id);
    if (!message || !loaded || message.senderId !== user._id) throw new ConvexError("MESSAGE_UNAVAILABLE");
    // Retry acknowledgement is harmless even if an already deleted row expired.
    if ("deletedAt" in message) return null;
    if (!messageVisible(message, loaded.membership) || (message.expiresAt !== undefined && message.expiresAt <= Date.now())) {
      throw new ConvexError("MESSAGE_UNAVAILABLE");
    }
    const now = Date.now();
    const storageId = message.type === "audio" ? message.audioStorageId : undefined;
    await ctx.db.replace("messages", messageId, {
      chatId: message.chatId, senderId: message.senderId, type: message.type, status: message.status,
      createdAt: message.createdAt, updatedAt: now, deletedAt: now,
      ...(message.clientMessageId !== undefined ? { clientMessageId: message.clientMessageId } : {}),
      ...(message.expiresAt !== undefined ? { expiresAt: message.expiresAt } : {}),
    });
    // The indexed reference check sees the replacement in this transaction.
    await deleteUnreferencedAudio(ctx, storageId);
    return null;
  },
});

export const listMessages = query({
  args: { chatId: v.id("chats"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({
    _id: v.id("messages"), senderId: v.id("users"), type: v.union(v.literal("text"), v.literal("audio")),
    text: v.optional(v.string()), audioDuration: v.optional(v.number()), createdAt: v.number(), expiresAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    status: v.union(v.literal("sent"), v.literal("read")),
  })),
  handler: async (ctx, { chatId, paginationOpts }) => {
    const user = await requireUser(ctx);
    const loaded = await loadChat(ctx, chatId, user._id);
    if (!loaded) throw new ConvexError("CHAT_UNAVAILABLE");
    if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 100) {
      throw new ConvexError("PAGE_SIZE_MUST_BE_1_TO_100");
    }
    for (const limit of [paginationOpts.maximumRowsRead, paginationOpts.maximumBytesRead]) {
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new ConvexError("INVALID_PAGINATION_LIMIT");
    }
    const cutoff = loaded.membership.clearedThrough;
    const result = await ctx.db.query("messages").withIndex("by_chat_created", q => {
      const range = q.eq("chatId", chatId);
      return cutoff ? range.gte("createdAt", cutoff.createdAt) : range;
    })
      .order("desc").paginate({ ...paginationOpts, maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 100, 100) });
    const now = Date.now();
    return { ...result, page: result.page.filter(message => messageVisible(message, loaded.membership) && (message.expiresAt === undefined || message.expiresAt > now))
      .map(message => ({ _id: message._id, senderId: message.senderId, ...messageContent(message),
        status: /** @type {"read" | "sent"} */ (messageRead(message, message.senderId === user._id ? loaded.peerMembership : loaded.membership) ? "read" : "sent"),
        createdAt: message.createdAt,
        ...(message.expiresAt !== undefined ? { expiresAt: message.expiresAt } : {}),
      })) };
  },
});
