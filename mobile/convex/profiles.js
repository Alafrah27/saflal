// @ts-check
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { areFriends, loadChat } from "./chats.js";
import { findBlock, hasBlockingRelationship } from "./lib/blocking.js";

export const get = query({
  args: { userId: v.id("users"), chatId: v.optional(v.id("chats")) },
  returns: v.union(v.null(), v.object({
    _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()), email: v.optional(v.string()), createdAt: v.optional(v.number()),
  })),
  handler: async (ctx, { userId, chatId }) => {
    const caller = await requireUser(ctx);
    if (userId === caller._id) throw new ConvexError("PROFILE_UNAVAILABLE");
    if (chatId !== undefined) {
      const loaded = await loadChat(ctx, chatId, caller._id);
      if (!loaded || loaded.peerId !== userId) throw new ConvexError("PROFILE_UNAVAILABLE");
    }
    const user = await ctx.db.get("users", userId);
    if (!user?.isActive) return null;
    const blocked = await hasBlockingRelationship(ctx, caller._id, userId);
    // Existing history and the caller's own block list already reveal basic
    // identity. Never expose reverse-block state or private details here.
    if (chatId === undefined && blocked && !await findBlock(ctx, caller._id, userId)) return null;
    return { _id: user._id, fullName: user.fullName,
      ...(user.nickName ? { nickName: user.nickName } : {}),
      ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}),
      ...(!blocked ? {
        createdAt: user.createdAt,
        ...(user.bio ? { bio: user.bio } : {}),
        ...(user.verifiedEmail && await areFriends(ctx, caller._id, userId) ? { email: user.verifiedEmail } : {}),
      } : {}),
    };
  },
});
