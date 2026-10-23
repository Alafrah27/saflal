// Staged temporarily in convex/; never retained in the final deployment.
// @ts-check
import { internalMutation } from "../../convex/_generated/server.js";
import { ConvexError, v } from "convex/values";

/** @param {string} runId */
function subjects(runId) {
  if (!/^[a-f0-9]{32}$/.test(runId)) throw new ConvexError("INVALID_FIXTURE_RUN");
  return ["a", "b", "c"].map(suffix => `saflal_chat_verification_${runId}_${suffix}`);
}

export const setup = internalMutation({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    const userIds = [];
    for (const clerkId of subjects(runId)) {
      if (await ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique()) {
        throw new ConvexError("FIXTURE_EXISTS");
      }
      const now = Date.now();
      userIds.push(await ctx.db.insert("users", {
        clerkId, fullName: "Chat verification fixture", isOnline: false,
        showOnlineStatus: false, showLastSeen: false, isActive: true, createdAt: now, updatedAt: now,
      }));
    }
    await ctx.db.insert("friendships", { user1Id: userIds[1], user2Id: userIds[0], createdAt: Date.now() });
    return { userIds };
  },
});

export const cleanup = internalMutation({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    const profiles = await Promise.all(subjects(runId).map(clerkId =>
      ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique()));
    if (profiles.some(profile => profile === null)) throw new ConvexError("FIXTURE_MISSING");
    const userIds = new Set(profiles.filter(profile => profile !== null).map(profile => profile._id));
    const memberships = [], friendships = [], blocks = [];
    for (const userId of userIds) {
      const owned = await ctx.db.query("chatMembers").withIndex("by_user", q => q.eq("userId", userId)).take(3);
      const forward = await ctx.db.query("friendships").withIndex("by_user1", q => q.eq("user1Id", userId)).take(3);
      const reverse = await ctx.db.query("friendships").withIndex("by_user2", q => q.eq("user2Id", userId)).take(3);
      const blocked = await ctx.db.query("blockedUsers").withIndex("by_blocker", q => q.eq("blockerId", userId)).take(3);
      if ([owned, forward, reverse, blocked].some(rows => rows.length >= 3)) throw new ConvexError("FIXTURE_LIMIT");
      memberships.push(...owned); friendships.push(...forward, ...reverse); blocks.push(...blocked);
    }
    if (friendships.some(row => !userIds.has(row.user1Id) || !userIds.has(row.user2Id)) ||
      blocks.some(row => !userIds.has(row.blockedId))) throw new ConvexError("FOREIGN_RELATIONSHIP");
    const chatIds = new Set(memberships.map(row => row.chatId));
    for (const chatId of chatIds) {
      const members = await ctx.db.query("chatMembers").withIndex("by_chat", q => q.eq("chatId", chatId)).take(3);
      if (members.length !== 2 || members.some(row => !userIds.has(row.userId)) ||
        await ctx.db.query("messages").withIndex("by_chat", q => q.eq("chatId", chatId)).first()) {
        throw new ConvexError("FOREIGN_CHAT_DATA");
      }
    }
    // Validation precedes every delete; only this run's disposable records qualify.
    for (const row of memberships) await ctx.db.delete("chatMembers", row._id);
    for (const chatId of chatIds) await ctx.db.delete("chats", chatId);
    for (const row of new Map(friendships.map(row => [row._id, row])).values()) await ctx.db.delete("friendships", row._id);
    for (const row of blocks) await ctx.db.delete("blockedUsers", row._id);
    for (const userId of userIds) await ctx.db.delete("users", userId);
    return { removedUsers: userIds.size, removedChats: chatIds.size };
  },
});
