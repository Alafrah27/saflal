// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { hasBlockingRelationship } from "./lib/blocking.js";
import { enqueueFriendPush } from "./lib/push.js";
import { directoryOrderKey } from "../shared/contactOrder.js";

/** @typedef {import("./_generated/server.js").QueryCtx} QueryCtx */
/** @typedef {import("./_generated/dataModel.js").Id<"users">} UserId */

const requestArgs = { requestId: v.id("friendRequests") };
const MAX_PAGE_SIZE = 100;

/** @param {QueryCtx} ctx @param {UserId} senderId @param {UserId} receiverId */
async function latestRequest(ctx, senderId, receiverId) {
  // History contains multiple records per direction after rejection/cancellation.
  return await ctx.db.query("friendRequests")
    .withIndex("by_pair", q => q.eq("senderId", senderId).eq("receiverId", receiverId))
    .order("desc").first();
}

/** @param {QueryCtx} ctx @param {UserId} user1Id @param {UserId} user2Id */
async function findFriendship(ctx, user1Id, user2Id) {
  const [forward, reverse] = await Promise.all([
    ctx.db.query("friendships")
      .withIndex("by_pair", q => q.eq("user1Id", user1Id).eq("user2Id", user2Id)).unique(),
    ctx.db.query("friendships")
      .withIndex("by_pair", q => q.eq("user1Id", user2Id).eq("user2Id", user1Id)).unique(),
  ]);
  return forward ?? reverse;
}

/**
 * @param {QueryCtx} ctx
 * @param {import("./_generated/dataModel.js").Id<"friendRequests">} requestId
 * @param {UserId} receiverId
 */
async function receivedRequest(ctx, requestId, receiverId) {
  const request = await ctx.db.get("friendRequests", requestId);
  if (!request || request.receiverId !== receiverId) {
    // A guessed request ID must not disclose another user's request existence.
    throw new ConvexError("REQUEST_UNAVAILABLE");
  }
  return request;
}

export const sendFriendRequest = mutation({
  args: { receiverId: v.id("users") },
  returns: v.object({ requestId: v.id("friendRequests"), status: v.literal("pending") }),
  handler: async (ctx, { receiverId }) => {
    const caller = await requireUser(ctx);
    if (caller._id === receiverId) throw new ConvexError("CANNOT_REQUEST_SELF");
    const receiver = await ctx.db.get("users", receiverId);
    if (!receiver?.isActive || await hasBlockingRelationship(ctx, caller._id, receiverId)) {
      throw new ConvexError("USER_UNAVAILABLE");
    }
    if (await findFriendship(ctx, caller._id, receiverId)) {
      throw new ConvexError("ALREADY_FRIENDS");
    }
    const [outgoing, incoming] = await Promise.all([
      latestRequest(ctx, caller._id, receiverId),
      latestRequest(ctx, receiverId, caller._id),
    ]);
    if (incoming?.status === "pending") throw new ConvexError("INCOMING_REQUEST_PENDING");
    if (outgoing?.status === "pending") return /** @type {const} */ ({ requestId: outgoing._id, status: "pending" });

    const now = Date.now();
    const requestId = await ctx.db.insert("friendRequests", {
      senderId: caller._id, receiverId, status: "pending", createdAt: now, updatedAt: now,
    });
    await enqueueFriendPush(ctx, { friendRequestId: requestId });
    return /** @type {const} */ ({ requestId, status: "pending" });
  },
});

export const acceptFriendRequest = mutation({
  args: requestArgs,
  returns: v.object({ requestId: v.id("friendRequests"), status: v.literal("accepted") }),
  handler: async (ctx, { requestId }) => {
    const caller = await requireUser(ctx);
    const request = await receivedRequest(ctx, requestId, caller._id);
    if (request.status === "accepted") return /** @type {const} */ ({ requestId, status: "accepted" });
    if (request.status !== "pending") throw new ConvexError("REQUEST_NOT_PENDING");
    const sender = await ctx.db.get("users", request.senderId);
    if (!sender?.isActive || sender._id === caller._id ||
      await hasBlockingRelationship(ctx, sender._id, caller._id)) {
      throw new ConvexError("REQUEST_UNAVAILABLE");
    }

    // These indexed checks, the friendship insert, and the request transition
    // commit in one transaction. Blocking/concurrent acceptance causes a retry.
    const friendship = await findFriendship(ctx, sender._id, caller._id);
    const now = Date.now();
    if (!friendship) {
      const [user1Id, user2Id] = [sender._id, caller._id].sort();
      const friendshipId = await ctx.db.insert("friendships", { user1Id, user2Id, createdAt: now });
      await ctx.db.patch("friendships", friendshipId, { directoryOrderKey: directoryOrderKey(friendshipId) });
    }
    await ctx.db.patch("friendRequests", requestId, { status: "accepted", updatedAt: now });
    await enqueueFriendPush(ctx, { friendRequestId: requestId, accepted: true });
    return /** @type {const} */ ({ requestId, status: "accepted" });
  },
});

export const rejectFriendRequest = mutation({
  args: requestArgs,
  returns: v.object({ requestId: v.id("friendRequests"), status: v.literal("rejected") }),
  handler: async (ctx, { requestId }) => {
    const caller = await requireUser(ctx);
    const request = await receivedRequest(ctx, requestId, caller._id);
    if (request.status === "rejected") return /** @type {const} */ ({ requestId, status: "rejected" });
    if (request.status !== "pending") throw new ConvexError("REQUEST_NOT_PENDING");
    // No sender lookup/block check: the receiver can dismiss obsolete requests.
    await ctx.db.patch("friendRequests", requestId, { status: "rejected", updatedAt: Date.now() });
    return /** @type {const} */ ({ requestId, status: "rejected" });
  },
});

export const getPendingFriendRequests = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({
    _id: v.id("friendRequests"), senderId: v.id("users"), receiverId: v.id("users"),
    status: v.literal("pending"), createdAt: v.number(), updatedAt: v.number(),
    sender: v.union(v.null(), v.object({
      fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()),
    })),
  })),
  handler: async (ctx, { paginationOpts }) => {
    const caller = await requireUser(ctx);
    if (!Number.isInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 || paginationOpts.numItems > MAX_PAGE_SIZE) {
      throw new ConvexError("PAGE_SIZE_MUST_BE_1_TO_100");
    }
    for (const limit of [paginationOpts.maximumRowsRead, paginationOpts.maximumBytesRead]) {
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
        throw new ConvexError("INVALID_PAGINATION_LIMIT");
      }
    }
    const result = await ctx.db.query("friendRequests")
      .withIndex("by_receiver_status", q => q.eq("receiverId", caller._id).eq("status", "pending"))
      .order("desc")
      .paginate({
        ...paginationOpts,
        maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
      });
    const page = await Promise.all(result.page.map(async request => {
      const sender = await ctx.db.get("users", request.senderId);
      return {
        _id: request._id, senderId: request.senderId, receiverId: request.receiverId,
        status: /** @type {"pending"} */ (request.status),
        createdAt: request.createdAt, updatedAt: request.updatedAt,
        sender: sender ? {
          fullName: sender.fullName,
          ...(sender.nickName ? { nickName: sender.nickName } : {}),
          ...(sender.imageUrl !== undefined ? { imageUrl: sender.imageUrl } : {}),
        } : null,
      };
    }));
    return { ...result, page };
  },
});

export const getFriendshipStatus = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({ status: v.union(v.literal("none"), v.literal("friends")) }),
    v.object({
      status: v.union(v.literal("outgoing_pending"), v.literal("incoming_pending")),
      requestId: v.id("friendRequests"),
    }),
  ),
  handler: async (ctx, { userId }) => {
    const caller = await requireUser(ctx);
    if (caller._id === userId) return /** @type {const} */ ({ status: "none" });
    if (await findFriendship(ctx, caller._id, userId)) return /** @type {const} */ ({ status: "friends" });
    const [outgoing, incoming] = await Promise.all([
      latestRequest(ctx, caller._id, userId),
      latestRequest(ctx, userId, caller._id),
    ]);
    if (incoming?.status === "pending") return /** @type {const} */ ({ status: "incoming_pending", requestId: incoming._id });
    if (outgoing?.status === "pending") return /** @type {const} */ ({ status: "outgoing_pending", requestId: outgoing._id });
    // Reject/cancel history and private block decisions are not status results.
    return /** @type {const} */ ({ status: "none" });
  },
});
