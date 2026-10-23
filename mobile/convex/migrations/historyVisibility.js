import { internalMutation, internalQuery } from "../_generated/server.js";
import { v } from "convex/values";

const args = { table: v.union(v.literal("chatMembers"), v.literal("calls")), cursor: v.union(v.string(), v.null()) };

function missing(row, table) {
  return table === "chatMembers" ? row.isHidden === undefined || row.lastActivityAt === undefined || row.lastActivityOrder === undefined
    : row.callerHistoryVisible === undefined || row.receiverHistoryVisible === undefined;
}

export const backfill = internalMutation({ args, handler: async (ctx, { table, cursor }) => {
  const result = await ctx.db.query(table).paginate({ cursor, numItems: 50, maximumRowsRead: 50 });
  let changed = 0;
  for (const row of result.page) {
    if (!missing(row, table)) continue;
    if (table === "chatMembers") {
      const chat = await ctx.db.get("chats", row.chatId);
      const message = chat?.lastMessageId ? await ctx.db.get("messages", chat.lastMessageId) : null;
      await ctx.db.patch(table, row._id, { isHidden: row.isHidden ?? false,
        lastActivityAt: row.lastActivityAt ?? chat?.lastMessageAt ?? chat?.createdAt ?? row.joinedAt,
        lastActivityOrder: row.lastActivityOrder ?? message?._creationTime ?? chat?._creationTime ?? row._creationTime });
    } else await ctx.db.patch(table, row._id, { callerHistoryVisible: row.callerHistoryVisible ?? true,
      receiverHistoryVisible: row.receiverHistoryVisible ?? true });
    changed++;
  }
  return { changed, scanned: result.page.length, isDone: result.isDone, continueCursor: result.continueCursor };
} });

export const verify = internalQuery({ args, handler: async (ctx, { table, cursor }) => {
  const result = await ctx.db.query(table).paginate({ cursor, numItems: 50, maximumRowsRead: 50 });
  return { missing: result.page.filter(row => missing(row, table)).length, scanned: result.page.length,
    isDone: result.isDone, continueCursor: result.continueCursor };
} });
