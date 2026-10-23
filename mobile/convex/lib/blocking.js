// @ts-check
// Ordinary server helpers, not registered Convex functions. Only trusted
// server code may supply both participants when enforcing communication rules.
/**
 * @param {import("../_generated/server.js").QueryCtx} ctx
 * @param {import("../_generated/dataModel.js").Id<"users">} blockerId
 * @param {import("../_generated/dataModel.js").Id<"users">} blockedId
 */
export async function findBlock(ctx, blockerId, blockedId) {
  return await ctx.db.query("blockedUsers")
    .withIndex("by_pair", q => q.eq("blockerId", blockerId).eq("blockedId", blockedId))
    .unique();
}

/**
 * @param {import("../_generated/server.js").QueryCtx} ctx
 * @param {import("../_generated/dataModel.js").Id<"users">} user1Id
 * @param {import("../_generated/dataModel.js").Id<"users">} user2Id
 */
export async function hasBlockingRelationship(ctx, user1Id, user2Id) {
  const [forward, reverse] = await Promise.all([
    findBlock(ctx, user1Id, user2Id),
    findBlock(ctx, user2Id, user1Id),
  ]);
  return forward !== null || reverse !== null;
}
