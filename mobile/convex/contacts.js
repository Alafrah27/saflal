// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { hasBlockingRelationship } from "./lib/blocking.js";
import { areFriends } from "./chats.js";
import { contactTraversal, contactSources, MAX_DIRECTORY_KEY } from "../shared/contactOrder.js";

const contactProfile = v.object({ _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()) });

export const listOrderedSegment = query({
  args: { seed: v.string(), source: v.union(v.literal("friends1"), v.literal("friends2"), v.literal("others")),
    wrap: v.boolean(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(contactProfile),
  handler: async (ctx, { seed, source, wrap, paginationOpts }) => {
    const caller = await requireUser(ctx);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seed) ||
      !contactSources.includes(source) || typeof wrap !== "boolean") throw new ConvexError("INVALID_CONTACT_ORDER");
    if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 100)
      throw new ConvexError("PAGE_SIZE_MUST_BE_1_TO_100");
    for (const limit of [paginationOpts.maximumRowsRead, paginationOpts.maximumBytesRead])
      if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new ConvexError("INVALID_PAGINATION_LIMIT");
    const { pivot, direction } = contactTraversal(seed, caller._id, source);
    const high = (direction === "asc") !== wrap;
    const options = { ...paginationOpts, maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 100, 100) };
    // Each invocation has exactly one native pagination range/cursor.
    const result = source === "others"
      ? await ctx.db.query("users").withIndex("by_active_directory_order", q => {
        const range = q.eq("isActive", true);
        return high ? range.gte("directoryOrderKey", pivot).lte("directoryOrderKey", MAX_DIRECTORY_KEY)
          : range.gte("directoryOrderKey", 0).lt("directoryOrderKey", pivot);
      }).order(direction).paginate(options)
      : await ctx.db.query("friendships").withIndex(source === "friends1" ? "by_user1_directory_order" : "by_user2_directory_order", q => {
        const range = q.eq(source === "friends1" ? "user1Id" : "user2Id", caller._id);
        return high ? range.gte("directoryOrderKey", pivot).lte("directoryOrderKey", MAX_DIRECTORY_KEY)
          : range.gte("directoryOrderKey", 0).lt("directoryOrderKey", pivot);
      }).order(direction).paginate(options);
    const visible = await Promise.all(result.page.map(async row => {
      const user = "user1Id" in row ? await ctx.db.get("users", source === "friends1" ? row.user2Id : row.user1Id) : row;
      if (!user || user._id === caller._id || !user.isActive ||
        await hasBlockingRelationship(ctx, caller._id, user._id) ||
        (source === "others" && await areFriends(ctx, caller._id, user._id))) return null;
      return { _id: user._id, fullName: user.fullName,
        ...(user.nickName ? { nickName: user.nickName } : {}), ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}) };
    }));
    return { ...result, page: visible.filter(user => user !== null) };
  },
});

// Minimal, current profile for a read-only contact conversation preview.
// This does not create a chat or grant message/history access.
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.object({
    _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()),
  })),
  handler: async (ctx, { userId }) => {
    const caller = await requireUser(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user?.isActive || user._id === caller._id ||
      await hasBlockingRelationship(ctx, caller._id, user._id)) return null;
    return { _id: user._id, fullName: user.fullName,
      ...(user.nickName ? { nickName: user.nickName } : {}),
      ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}) };
  },
});

// Paginate before filtering; sparse pages must never cause an unbounded scan.
export const listUsers = query({
  args: { paginationOpts: paginationOptsValidator, friendsOnly: v.optional(v.boolean()) },
  returns: paginationResultValidator(v.object({
    _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()),
  })),
  handler: async (ctx, { paginationOpts, friendsOnly = false }) => {
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
    const result = await ctx.db.query("users").order("desc").paginate({
      ...paginationOpts,
      maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 100, 100),
    });
    const visible = await Promise.all(result.page.map(async user => {
      if (user._id === caller._id || !user.isActive ||
        await hasBlockingRelationship(ctx, caller._id, user._id) ||
        (friendsOnly && !await areFriends(ctx, caller._id, user._id))) return null;
      return {
        _id: user._id, fullName: user.fullName,
        ...(user.nickName ? { nickName: user.nickName } : {}),
        ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}),
      };
    }));
    return { ...result, page: visible.filter(user => user !== null) };
  },
});
