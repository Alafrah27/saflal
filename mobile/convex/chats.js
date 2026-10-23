// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { hasBlockingRelationship } from "./lib/blocking.js";
import { historyListsReady, messageRead, messageVisible, validateDeleteIds } from "./lib/historyVisibility.js";
import { messageContent } from "./lib/messageContent.js";

/** @typedef {import("./_generated/server.js").QueryCtx} QueryCtx */
/** @typedef {import("./_generated/dataModel.js").Id<"users">} UserId */
/** @typedef {import("./_generated/dataModel.js").Id<"chats">} ChatId */

export const chatViewValidator = v.object({
  chatId: v.id("chats"), type: v.literal("direct"),
  disappearingMessages: v.boolean(),
  lastMessageId: v.optional(v.id("messages")), lastMessageAt: v.optional(v.number()),
  lastMessage: v.optional(v.union(v.null(), v.object({
    _id: v.id("messages"),
    senderId: v.id("users"),
    type: v.union(v.literal("text"), v.literal("audio")),
    text: v.optional(v.string()),
    audioDuration: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    status: v.union(v.literal("sent"), v.literal("read")),
    createdAt: v.number(),
  }))),
  unreadCount: v.optional(v.number()),
  createdAt: v.number(), updatedAt: v.number(),
  peer: v.union(v.null(), v.object({
    _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()),
  })),
  membership: v.object({
    joinedAt: v.number(), lastReadAt: v.optional(v.number()),
    isArchived: v.boolean(), isMuted: v.boolean(),
  }),
});

/** @param {UserId} user1Id @param {UserId} user2Id */
export function pairKey(user1Id, user2Id) {
  return JSON.stringify([user1Id, user2Id].sort());
}

/** @param {QueryCtx} ctx @param {UserId} user1Id @param {UserId} user2Id */
export async function areFriends(ctx, user1Id, user2Id) {
  const [forward, reverse] = await Promise.all([
    ctx.db.query("friendships")
      .withIndex("by_pair", q => q.eq("user1Id", user1Id).eq("user2Id", user2Id)).first(),
    ctx.db.query("friendships")
      .withIndex("by_pair", q => q.eq("user1Id", user2Id).eq("user2Id", user1Id)).first(),
  ]);
  return forward !== null || reverse !== null;
}

// Reject malformed membership sets instead of granting access or repairing data.
// Each lookup is bounded, including duplicate detection.
/** @param {QueryCtx} ctx @param {ChatId} chatId @param {UserId} callerId */
export async function loadChat(ctx, chatId, callerId) {
  const owned = await ctx.db.query("chatMembers")
    .withIndex("by_chat_user", q => q.eq("chatId", chatId).eq("userId", callerId)).take(2);
  if (owned.length !== 1) return null;
  const chat = await ctx.db.get("chats", chatId);
  if (!chat || chat.type !== "direct") return null;
  const members = await ctx.db.query("chatMembers")
    .withIndex("by_chat", q => q.eq("chatId", chatId)).take(3);
  if (members.length !== 2 || members[0].userId === members[1].userId ||
    !members.some(member => member._id === owned[0]._id)) return null;
  const peerMember = members.find(member => member.userId !== callerId);
  if (!peerMember || (chat.directPairKey !== undefined &&
    chat.directPairKey !== pairKey(callerId, peerMember.userId))) return null;
  return { chat, membership: owned[0], peerMembership: peerMember, peerId: peerMember.userId };
}

/** @param {QueryCtx} ctx @param {NonNullable<Awaited<ReturnType<typeof loadChat>>>} loaded */
export async function projectChat(ctx, { chat, membership, peerMembership, peerId }) {
  const peer = await ctx.db.get("users", peerId);
  const now = Date.now();
  let lastMessage = null;
  if (chat.lastMessageId !== undefined) {
    const msg = await ctx.db.get("messages", chat.lastMessageId);
    if (msg && messageVisible(msg, membership) && (msg.expiresAt === undefined || msg.expiresAt > now)) {
      /** @type {"read" | "sent"} */
      const status = messageRead(msg, msg.senderId === membership.userId ? peerMembership : membership) ? "read" : "sent";
      lastMessage = {
        _id: msg._id,
        senderId: msg.senderId ?? peerId,
        ...messageContent(msg),
        status,
        createdAt: msg.createdAt ?? chat.lastMessageAt ?? now,
      };
    }
  }

  let unreadCount = 0;
  const lastReadAt = membership.readThrough?.createdAt ?? membership.lastReadAt ?? 0;
  if (chat.lastMessageAt !== undefined && chat.lastMessageAt >= lastReadAt) {
    const recent = await ctx.db.query("messages")
      .withIndex("by_chat_sender_created", q => q.eq("chatId", chat._id).eq("senderId", peerId).gt("createdAt", Math.max(lastReadAt, membership.clearedThrough?.createdAt ?? 0) - 1))
      .order("desc")
      .take(100);
    unreadCount = recent.filter(msg =>
      !("deletedAt" in msg) && !messageRead(msg, membership) && messageVisible(msg, membership) && (msg.expiresAt === undefined || msg.expiresAt > now)
    ).length;
  }

  return {
    chatId: chat._id, type: chat.type, disappearingMessages: chat.disappearingMessages,
    ...((!membership.clearedThrough || lastMessage) && chat.lastMessageId !== undefined ? { lastMessageId: chat.lastMessageId } : {}),
    ...((!membership.clearedThrough || lastMessage) && chat.lastMessageAt !== undefined ? { lastMessageAt: chat.lastMessageAt } : {}),
    ...(lastMessage !== null ? { lastMessage } : {}),
    unreadCount,
    createdAt: chat.createdAt, updatedAt: chat.updatedAt,
    peer: peer ? {
      _id: peer._id, fullName: peer.fullName,
      ...(peer.nickName ? { nickName: peer.nickName } : {}),
      ...(peer.imageUrl !== undefined ? { imageUrl: peer.imageUrl } : {}),
    } : null,
    membership: {
      joinedAt: membership.joinedAt, isArchived: membership.isArchived, isMuted: membership.isMuted,
      ...(membership.lastReadAt !== undefined ? { lastReadAt: membership.lastReadAt } : {}),
    },
  };
}

export const getOrCreateDirectChat = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, { userId }) => {
    const caller = await requireUser(ctx);
    if (caller._id === userId) throw new ConvexError("CANNOT_CHAT_WITH_SELF");
    const recipient = await ctx.db.get("users", userId);
    if (!recipient?.isActive || await hasBlockingRelationship(ctx, caller._id, userId) ||
      !await areFriends(ctx, caller._id, userId)) throw new ConvexError("USER_UNAVAILABLE");

    const directPairKey = pairKey(caller._id, userId);
    const existing = await ctx.db.query("chats")
      .withIndex("by_direct_pair", q => q.eq("directPairKey", directPairKey)).take(2);
    if (existing.length > 1) throw new ConvexError("CHAT_UNAVAILABLE");
    if (existing.length === 1) {
      const loaded = await loadChat(ctx, existing[0]._id, caller._id);
      if (!loaded || loaded.peerId !== userId) throw new ConvexError("CHAT_UNAVAILABLE");
      if (loaded.membership.isHidden) await ctx.db.patch("chatMembers", loaded.membership._id, {
        isHidden: false, lastActivityAt: loaded.chat.createdAt, lastActivityOrder: loaded.chat._creationTime,
      });
      return { chatId: existing[0]._id };
    }

    // The indexed absence check and all three inserts share one transaction.
    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      type: "direct", directPairKey, disappearingMessages: false, createdAt: now, updatedAt: now,
    });
    const createdChat = await ctx.db.get("chats", chatId);
    for (const memberId of [caller._id, userId].sort()) {
      await ctx.db.insert("chatMembers", {
        chatId, userId: memberId, joinedAt: now, isArchived: false, isMuted: false, isHidden: false, lastActivityAt: now,
        lastActivityOrder: createdChat?._creationTime ?? now,
      });
    }
    return { chatId };
  },
});

export const getChat = query({
  args: { chatId: v.id("chats") }, returns: chatViewValidator,
  handler: async (ctx, { chatId }) => {
    const caller = await requireUser(ctx);
    const loaded = await loadChat(ctx, chatId, caller._id);
    if (!loaded) throw new ConvexError("CHAT_UNAVAILABLE");
    // Blocking/friendship changes do not revoke existing history access.
    return await projectChat(ctx, loaded);
  },
});

export const getMyChats = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(chatViewValidator),
  handler: async (ctx, { paginationOpts }) => {
    const caller = await requireUser(ctx);
    if (!Number.isInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 || paginationOpts.numItems > 100) {
      throw new ConvexError("PAGE_SIZE_MUST_BE_1_TO_100");
    }
    for (const limit of [paginationOpts.maximumRowsRead, paginationOpts.maximumBytesRead]) {
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
        throw new ConvexError("INVALID_PAGINATION_LIMIT");
      }
    }
    const source = historyListsReady()
      ? ctx.db.query("chatMembers").withIndex("by_user_visible_activity", q => q.eq("userId", caller._id).eq("isHidden", false))
      : ctx.db.query("chatMembers").withIndex("by_user", q => q.eq("userId", caller._id));
    const result = await source.order("desc").paginate({
        ...paginationOpts,
        maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 100, 100),
      });
    const views = await Promise.all(result.page.map(async membership => {
      if (membership.isHidden) return null;
      const loaded = await loadChat(ctx, membership.chatId, caller._id);
      if (!loaded || loaded.membership._id !== membership._id) return null;
      return await projectChat(ctx, loaded);
    }));
    return { ...result, page: views.filter(view => view !== null) };
  },
});

export const deleteForMe = mutation({
  args: { chatIds: v.array(v.id("chats")) }, returns: v.null(),
  handler: async (ctx, { chatIds }) => {
    const caller = await requireUser(ctx);
    validateDeleteIds(chatIds);
    const chats = await Promise.all(chatIds.map(id => loadChat(ctx, id, caller._id)));
    if (chats.some(chat => !chat)) throw new ConvexError("CHAT_UNAVAILABLE");
    // Validate the entire batch before any writes. Convex serializes this with sends.
    for (const loaded of chats) {
      if (!loaded || loaded.membership.isHidden) continue;
      const latest = await ctx.db.query("messages").withIndex("by_chat_created", q => q.eq("chatId", loaded.chat._id)).order("desc").first();
      await ctx.db.patch("chatMembers", loaded.membership._id, { isHidden: true,
        ...(latest && messageVisible(latest, loaded.membership) ? {
          clearedThrough: { createdAt: latest.createdAt, creationTime: latest._creationTime },
        } : {}),
      });
    }
    return null;
  },
});

// Both text and voice commits update this indexed per-member inbox in the same transaction.
/** @param {import("./_generated/server.js").MutationCtx} ctx
 * @param {NonNullable<Awaited<ReturnType<typeof loadChat>>>} loaded
 * @param {import("./_generated/dataModel.js").Id<"messages">} messageId
 * @param {number} createdAt */
export async function recordChatActivity(ctx, loaded, messageId, createdAt) {
  await ctx.db.patch("chats", loaded.chat._id, { lastMessageId: messageId, lastMessageAt: createdAt, updatedAt: createdAt });
  const message = await ctx.db.get("messages", messageId);
  for (const member of [loaded.membership, loaded.peerMembership])
    await ctx.db.patch("chatMembers", member._id, { isHidden: false, lastActivityAt: createdAt, lastActivityOrder: message?._creationTime ?? createdAt });
}

export const markAsRead = mutation({
  args: { chatId: v.id("chats"), messageId: v.optional(v.id("messages")) },
  returns: v.null(),
  handler: async (ctx, { chatId, messageId }) => {
    const caller = await requireUser(ctx);
    const loaded = await loadChat(ctx, chatId, caller._id);
    if (!loaded) throw new ConvexError("CHAT_UNAVAILABLE");
    const targetId = messageId ?? loaded.chat.lastMessageId;
    if (!targetId) return null;
    const target = await ctx.db.get("messages", targetId);
    if (!target || target.chatId !== chatId)
      throw new ConvexError("MESSAGE_UNAVAILABLE");
    if (!messageVisible(target, loaded.membership)) {
      if (messageId) throw new ConvexError("MESSAGE_UNAVAILABLE");
      return null; // Older clients may acknowledge a personally cleared chat.
    }
    if (loaded.membership.readThrough && messageRead(target, loaded.membership)) return null;
    // One membership write covers all older text/audio messages, including >50.
    await ctx.db.patch("chatMembers", loaded.membership._id, {
      lastReadAt: target.createdAt,
      readThrough: { createdAt: target.createdAt, creationTime: target._creationTime },
    });
    return null;
  },
});
