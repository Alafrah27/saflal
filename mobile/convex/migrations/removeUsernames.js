// @ts-check
import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server.js";

// Maintenance-only migration. Never a public endpoint. Make username optional
// and take a deployment backup before running; remove it from the schema after.
export const remove = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({
    removedCount: v.number(), scannedCount: v.number(),
    continueCursor: v.string(), isDone: v.boolean(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db.query("users").paginate({ numItems: 100, cursor, maximumRowsRead: 100 });
    let removedCount = 0;
    for (const user of result.page) {
      if (typeof user.fullName !== "string") throw new ConvexError("FULL_NAME_REQUIRED_BEFORE_MIGRATION");
      if (!Object.hasOwn(user, "username")) continue;
      const removedFields = /** @type {Record<string, undefined>} */ ({ username: undefined });
      await ctx.db.patch("users", user._id, removedFields);
      removedCount++;
    }
    return { removedCount, scannedCount: result.page.length, continueCursor: result.continueCursor, isDone: result.isDone };
  },
});
