// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { findBlock } from "./lib/blocking.js";
import { stopBlockedCalls } from "./calls.js";

const targetArgs = { blockedId: v.id("users") };
const statusResult = v.object({ isBlockedByMe: v.boolean() });
const MAX_PAGE_SIZE = 100;

export const blockUser = mutation({
  args: targetArgs,
  returns: statusResult,
  handler: async (ctx, { blockedId }) => {
    const caller = await requireUser(ctx);
    if (caller._id === blockedId) throw new ConvexError("CANNOT_BLOCK_SELF");
    if (!await ctx.db.get("users", blockedId)) throw new ConvexError("USER_NOT_FOUND");

    // The indexed read and insert share a Convex transaction. Concurrent
    // attempts conflict and retry rather than inserting duplicate pairs.
    if (!await findBlock(ctx, caller._id, blockedId)) {
      await ctx.db.insert("blockedUsers", {
        blockerId: caller._id, blockedId, createdAt: Date.now(),
      });
    }
    await stopBlockedCalls(ctx, caller._id, blockedId);
    return { isBlockedByMe: true };
  },
});

export const unblockUser = mutation({
  args: targetArgs,
  returns: statusResult,
  handler: async (ctx, { blockedId }) => {
    const caller = await requireUser(ctx);
    // Do not require the target profile: a deleted user must remain unblockable.
    const block = await findBlock(ctx, caller._id, blockedId);
    if (block) await ctx.db.delete("blockedUsers", block._id);
    return { isBlockedByMe: false };
  },
});

export const getBlockingStatus = query({
  args: targetArgs,
  returns: statusResult,
  handler: async (ctx, { blockedId }) => {
    const caller = await requireUser(ctx);
    // Deliberately disclose only the caller's decision, never the reverse pair.
    return { isBlockedByMe: !!await findBlock(ctx, caller._id, blockedId) };
  },
});

export const getBlockedUsers = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({
    _id: v.id("blockedUsers"),
    blockedId: v.id("users"),
    createdAt: v.number(),
    user: v.union(v.null(), v.object({
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
    const result = await ctx.db.query("blockedUsers")
      .withIndex("by_blocker", q => q.eq("blockerId", caller._id))
      .order("desc")
      .paginate({
        ...paginationOpts,
        // Keep native endCursor/id/split behavior, but never let the client
        // remove the server's read bound during reactive page expansion.
        maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
      });
    const page = await Promise.all(result.page.map(async block => {
      const user = await ctx.db.get("users", block.blockedId);
      return {
        _id: block._id, blockedId: block.blockedId, createdAt: block.createdAt,
        user: user ? {
          fullName: user.fullName,
          ...(user.nickName ? { nickName: user.nickName } : {}),
          ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}),
        } : null,
      };
    }));
    return { ...result, page };
  },
});
