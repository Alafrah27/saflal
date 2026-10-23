// @ts-check
import { internal } from "../_generated/api.js";
import { hasBlockingRelationship } from "./blocking.js";
import { messageRead, messageVisible } from "./historyVisibility.js";
import { displayName } from "../../shared/displayName.js";

/** @typedef {import("../_generated/server.js").QueryCtx} QueryCtx */
/** @typedef {import("../_generated/server.js").MutationCtx} MutationCtx */
/** @typedef {import("../_generated/dataModel.js").Doc<"pushDeliveries">} Delivery */

/** @param {QueryCtx} ctx @param {Pick<Delivery, "kind" | "friendRequestId" | "messageId">} event */
export async function resolvePushEvent(ctx, event) {
  if (event.kind === "message") {
    if (!event.messageId) return null;
    const message = await ctx.db.get("messages", event.messageId);
    if (!message || "deletedAt" in message || (message.expiresAt !== undefined && message.expiresAt <= Date.now())) return null;
    if (message.type === "text" ? !message.text?.trim() :
      !message.audioStorageId || typeof message.audioDuration !== "number" ||
      !Number.isFinite(message.audioDuration) || !(message.audioDuration > 0)) return null;
    const chat = await ctx.db.get("chats", message.chatId);
    const members = await ctx.db.query("chatMembers")
      .withIndex("by_chat", q => q.eq("chatId", message.chatId)).take(3);
    if (!chat || chat.type !== "direct" || members.length !== 2 || members[0].userId === members[1].userId ||
      !members.some(member => member.userId === message.senderId)) return null;
    const recipient = members.find(member => member.userId !== message.senderId);
    if (!recipient || !messageVisible(message, recipient) || recipient.isMuted || messageRead(message, recipient) || (chat.directPairKey !== undefined &&
      chat.directPairKey !== JSON.stringify(members.map(member => member.userId).sort()))) return null;
    return { actorId: message.senderId, recipientId: recipient.userId, message, chatId: chat._id };
  }
  if (!event.friendRequestId) return null;
  const request = await ctx.db.get("friendRequests", event.friendRequestId);
  if (!request || request.senderId === request.receiverId) return null;
  if (event.kind === "friend_request" && request.status === "pending") {
    return { actorId: request.senderId, recipientId: request.receiverId, request };
  }
  if (event.kind === "friend_accepted" && request.status === "accepted") {
    const [a, b] = await Promise.all([
      ctx.db.query("friendships").withIndex("by_pair", q => q.eq("user1Id", request.senderId).eq("user2Id", request.receiverId)).first(),
      ctx.db.query("friendships").withIndex("by_pair", q => q.eq("user1Id", request.receiverId).eq("user2Id", request.senderId)).first(),
    ]);
    if (a || b) return { actorId: request.receiverId, recipientId: request.senderId, request };
  }
  return null;
}

/** @param {QueryCtx} ctx @param {import("../_generated/dataModel.js").Id<"users">} actorId @param {import("../_generated/dataModel.js").Id<"users">} recipientId */
async function eligibleProfiles(ctx, actorId, recipientId) {
  const [actor, recipient] = await Promise.all([ctx.db.get("users", actorId), ctx.db.get("users", recipientId)]);
  if (!actor?.isActive || !recipient?.isActive || recipient.notificationsEnabled === false ||
    await hasBlockingRelationship(ctx, actorId, recipientId)) return null;
  return actor;
}

/** @param {MutationCtx} ctx @param {Pick<Delivery, "kind" | "friendRequestId" | "messageId">} event */
async function enqueue(ctx, event) {
  const source = await resolvePushEvent(ctx, event);
  if (!source || !await eligibleProfiles(ctx, source.actorId, source.recipientId)) return;
  const eventKey = `${event.kind}:${event.messageId ?? event.friendRequestId}`;
  const devices = await ctx.db.query("devices")
    .withIndex("by_user_active", q => q.eq("userId", source.recipientId).eq("isActive", true)).take(20);
  let inserted = false;
  for (const device of devices) {
    if (await ctx.db.query("pushDeliveries")
      .withIndex("by_event_device", q => q.eq("eventKey", eventKey).eq("deviceId", device._id)).first()) continue;
    const now = Date.now();
    await ctx.db.insert("pushDeliveries", {
      ...event, eventKey, actorId: source.actorId, recipientId: source.recipientId,
      ...(source.chatId ? { chatId: source.chatId } : {}),
      deviceId: device._id, registrationVersion: device.registrationVersion ?? 0,
      status: "pending", attempts: 0, receiptAttempts: 0, dueAt: now, createdAt: now, updatedAt: now,
    });
    inserted = true;
  }
  if (inserted) await ctx.scheduler.runAfter(0, internal.push.tick, {});
}

/** @param {MutationCtx} ctx @param {{friendRequestId: import("../_generated/dataModel.js").Id<"friendRequests">, accepted?: boolean}} args */
export async function enqueueFriendPush(ctx, { friendRequestId, accepted = false }) {
  await enqueue(ctx, { kind: accepted ? "friend_accepted" : "friend_request", friendRequestId });
}

// Ordinary server helper, never a public notification-sending endpoint.
/** @param {MutationCtx} ctx @param {{messageId: import("../_generated/dataModel.js").Id<"messages">}} args */
export async function enqueueMessagePush(ctx, { messageId }) {
  await enqueue(ctx, { kind: "message", messageId });
}

/** @param {QueryCtx} ctx @param {Delivery} delivery */
export async function deliveryPayload(ctx, delivery) {
  const device = await ctx.db.get("devices", delivery.deviceId);
  if (!device?.isActive || device.userId !== delivery.recipientId ||
    (device.registrationVersion ?? 0) !== delivery.registrationVersion) return null;
  const source = await resolvePushEvent(ctx, delivery);
  if (!source || source.actorId !== delivery.actorId || source.recipientId !== delivery.recipientId) return null;
  const actor = await eligibleProfiles(ctx, source.actorId, source.recipientId);
  if (!actor) return null;
  const arabic = device.language === "ar";
  const fullName = [...displayName(actor)].slice(0, 80).join("");
  let title = fullName, body;
  if (delivery.kind === "friend_request") {
    title = arabic ? "طلب صداقة" : "Friend request";
    body = arabic ? `${fullName} أرسل إليك طلب صداقة` : `${fullName} sent you a friend request`;
  } else if (delivery.kind === "friend_accepted") {
    title = arabic ? "تم قبول طلب الصداقة" : "Friend request accepted";
    body = arabic ? `${fullName} قبل طلب صداقتك` : `${fullName} accepted your friend request`;
  } else {
    body = source.message?.type === "audio" ? (arabic ? "رسالة صوتية" : "Voice message") :
      [...(source.message?.text?.trim() ?? "")].slice(0, 160).join("");
  }
  const data = {
    eventId: delivery._id, type: delivery.kind, recipientId: delivery.recipientId,
    ...(delivery.friendRequestId ? { requestId: delivery.friendRequestId } : {}),
    ...(delivery.messageId ? { messageId: delivery.messageId } : {}),
    ...(delivery.chatId ? { chatId: delivery.chatId } : {}),
  };
  return { to: device.expoPushToken, title, body, data, sound: "default", channelId: "default", priority: "high",
    ttl: Math.max(1, Math.min(86400, Math.floor(((source.message?.expiresAt ?? Date.now() + 86400000) - Date.now()) / 1000))) };
}
