// @ts-check
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query as defineQuery } from "./_generated/server.js";
import { requireUser } from "./auth.js";
import { chatViewValidator, loadChat, pairKey, projectChat } from "./chats.js";
import { hasBlockingRelationship } from "./lib/blocking.js";
import { searchInput } from "./lib/searchPolicy.js";

const args = { query: v.string(), paginationOpts: paginationOptsValidator,
  field: v.optional(v.union(v.literal("fullName"), v.literal("nickName"))) };
const profile = v.object({ _id: v.id("users"), fullName: v.string(), nickName: v.optional(v.string()), imageUrl: v.optional(v.string()) });

/** @param {string} query @param {import("convex/server").PaginationOptions} paginationOpts */
function validate(query, paginationOpts) {
  if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
    throw new ConvexError("PAGE_SIZE_MUST_BE_1_TO_50");
  for (const limit of [paginationOpts.maximumRowsRead, paginationOpts.maximumBytesRead])
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw new ConvexError("INVALID_PAGINATION_LIMIT");
  const input = searchInput(query);
  if (!input.valid) throw new ConvexError("INVALID_SEARCH_QUERY");
  return input.query;
}

/** @param {import("./_generated/server.js").QueryCtx} ctx @param {string} text
 * @param {import("convex/server").PaginationOptions} paginationOpts @param {boolean} activeOnly
 * @param {"fullName" | "nickName"} field */
async function candidates(ctx, text, paginationOpts, activeOnly, field) {
  if (!text) return { page: [], isDone: true, continueCursor: "" };
  return ctx.db.query("users").withSearchIndex(field === "nickName" ? "search_nickName" : "search_fullName", q => {
    const search = q.search(field, text);
    return activeOnly ? search.eq("isActive", true) : search;
  }).paginate({ ...paginationOpts, maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 50, 50) });
}

export const people = defineQuery({ args, returns: paginationResultValidator(profile), handler: async (ctx, { query, paginationOpts, field = "fullName" }) => {
  const caller = await requireUser(ctx);
  const result = await candidates(ctx, validate(query, paginationOpts), paginationOpts, true, field);
  const visible = await Promise.all(result.page.map(async user => {
    if (user._id === caller._id || !user.isActive || await hasBlockingRelationship(ctx, caller._id, user._id)) return null;
    return { _id: user._id, fullName: user.fullName, ...(user.nickName ? { nickName: user.nickName } : {}), ...(user.imageUrl !== undefined ? { imageUrl: user.imageUrl } : {}) };
  }));
  return { ...result, page: visible.filter(user => user !== null) };
} });

export const chats = defineQuery({ args, returns: paginationResultValidator(chatViewValidator), handler: async (ctx, { query, paginationOpts, field = "fullName" }) => {
  const caller = await requireUser(ctx);
  // Search profiles first; membership/block/history checks never scan all chats.
  // Historical chats remain readable after blocking or peer deactivation.
  const result = await candidates(ctx, validate(query, paginationOpts), paginationOpts, false, field);
  const visible = await Promise.all(result.page.map(async user => {
    if (user._id === caller._id) return null;
    const matches = await ctx.db.query("chats").withIndex("by_direct_pair", q =>
      q.eq("directPairKey", pairKey(caller._id, user._id))).take(2);
    if (matches.length !== 1) return null;
    const loaded = await loadChat(ctx, matches[0]._id, caller._id);
    if (!loaded || loaded.peerId !== user._id || loaded.membership.isHidden) return null;
    return projectChat(ctx, loaded);
  }));
  return { ...result, page: visible.filter(chat => chat !== null) };
} });
