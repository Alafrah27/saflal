// @ts-check
import { internalMutation, internalQuery } from "../_generated/server.js";
import { v } from "convex/values";
import { directoryOrderKey } from "../../shared/contactOrder.js";

const args = { table: v.union(v.literal("users"), v.literal("friendships")), cursor: v.union(v.string(), v.null()) };

export const backfill = internalMutation({ args, handler: async (ctx, { table, cursor }) => {
  const result = await ctx.db.query(table).paginate({ cursor, numItems: 50, maximumRowsRead: 50 });
  let changed = 0;
  for (const row of result.page) {
    const key = directoryOrderKey(row._id);
    if (row.directoryOrderKey === key) continue;
    await ctx.db.patch(table, row._id, { directoryOrderKey: key });
    changed++;
  }
  return { changed, scanned: result.page.length, isDone: result.isDone, continueCursor: result.continueCursor };
} });

export const verify = internalQuery({ args, handler: async (ctx, { table, cursor }) => {
  const result = await ctx.db.query(table).paginate({ cursor, numItems: 50, maximumRowsRead: 50 });
  return { missing: result.page.filter(row => row.directoryOrderKey !== directoryOrderKey(row._id)).length,
    scanned: result.page.length, isDone: result.isDone, continueCursor: result.continueCursor };
} });
