import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireUser } from "./auth.js";
import { activeCalls, authorizePair, callEventPatch, liveCall, RING_MS, validCallRequest } from "./lib/callPolicy.js";
import { historyListsReady, validateDeleteIds } from "./lib/historyVisibility.js";

const callArgs = { callId: v.id("calls") };
async function owned(ctx, callId) {
  const user = await requireUser(ctx), call = await ctx.db.get("calls", callId);
  if (!call || ![call.callerId, call.receiverId].includes(user._id)) throw new ConvexError("CALL_UNAVAILABLE");
  return { call, user };
}
async function finish(ctx, call, status, outcome) {
  if (!liveCall(call)) return;
  await ctx.db.patch("calls", call._id, { status, outcome, endedAt: Date.now(), cleanupPending: true });
  await ctx.scheduler.runAfter(0, internal.streamCalls.closeCall, { callId: call._id });
}
async function view(ctx, call, userId) {
  const peerId = call.callerId === userId ? call.receiverId : call.callerId;
  const peer = await ctx.db.get("users", peerId);
  const { callerHistoryVisible, receiverHistoryVisible, ...record } = call;
  return { ...record, peer: peer ? { _id: peer._id, fullName: peer.fullName, ...(peer.nickName ? { nickName: peer.nickName } : {}), imageUrl: peer.imageUrl ?? null } : null,
    historyVisible: (call.callerId === userId ? callerHistoryVisible : receiverHistoryVisible) !== false,
    direction: call.callerId === userId ? "outgoing" : "incoming" };
}

export const sessionUser = internalQuery({ args: {}, handler: ctx => requireUser(ctx) });
export const reserve = internalMutation({
  args: { chatId: v.id("chats"), requestId: v.string() },
  handler: async (ctx, { chatId, requestId }) => {
    const user = await requireUser(ctx);
    if (!validCallRequest(requestId)) throw new ConvexError("INVALID_CALL_REQUEST");
    const { peer } = await authorizePair(ctx, chatId, user._id);
    const existing = await ctx.db.query("calls").withIndex("by_caller_request", q => q.eq("callerId", user._id).eq("requestId", requestId)).unique();
    if (existing) {
      if (existing.chatId !== chatId) throw new ConvexError("INVALID_CALL_REQUEST");
      return { call: existing, fresh: false };
    }
    const recent = await ctx.db.query("calls").withIndex("by_caller", q => q.eq("callerId", user._id)).order("desc").take(6);
    if (recent.filter(c => c.createdAt > Date.now() - 60_000).length >= 5) throw new ConvexError("CALL_RATE_LIMITED");
    if ((await activeCalls(ctx, user._id)).length || (await activeCalls(ctx, peer._id)).length) throw new ConvexError("CALL_BUSY");
    const now = Date.now();
    const callId = await ctx.db.insert("calls", { callerId: user._id, receiverId: peer._id, chatId, requestId,
      streamCallId: "", type: "audio", status: "ringing", provisioned: false, callerHistoryVisible: true, receiverHistoryVisible: true,
      createdAt: now, ringDeadline: now + RING_MS, cleanupPending: false });
    // Stream call IDs are limited to 64 characters. The unique Convex record ID
    // keeps this short and prevents client-selected request IDs from colliding
    // across users. Insert and patch commit atomically; no empty ID is exposed.
    await ctx.db.patch("calls", callId, { streamCallId: `saflal_${callId}` });
    await ctx.scheduler.runAfter(RING_MS, internal.calls.expire, { callId });
    return { call: await ctx.db.get("calls", callId), fresh: true };
  },
});

export const provisionInfo = internalQuery({ args: callArgs, handler: async (ctx, { callId }) => {
  const call = await ctx.db.get("calls", callId);
  if (!liveCall(call) || !call.chatId || call.ringDeadline <= Date.now()) return null;
  try { return { call, ...await authorizePair(ctx, call.chatId, call.callerId) }; } catch { return null; }
} });
export const markProvisioned = internalMutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const call = await ctx.db.get("calls", callId);
  if (!liveCall(call)) return false;
  // The external call may have raced blocking/cancellation; recheck before exposing it.
  try { await authorizePair(ctx, call.chatId, call.callerId); } catch {
    await finish(ctx, call, "ended", "unavailable"); return false;
  }
  await ctx.db.patch("calls", callId, { provisioned: true }); return true;
} });
export const fail = internalMutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const call = await ctx.db.get("calls", callId); if (call) await finish(ctx, call, "failed", "connection_failed");
} });

export const authorizeJoin = query({ args: callArgs, handler: async (ctx, { callId }) => {
  const { call, user } = await owned(ctx, callId);
  if (!liveCall(call) || !call.provisioned || !call.chatId ||
    (call.status === "ringing" && call.ringDeadline <= Date.now())) throw new ConvexError("CALL_UNAVAILABLE");
  await authorizePair(ctx, call.chatId, user._id);
  return { streamCallId: call.streamCallId, userId: user._id };
} });
export const getCall = query({ args: callArgs, handler: async (ctx, { callId }) => {
  const { call, user } = await owned(ctx, callId); return view(ctx, call, user._id);
} });
export const getByStreamId = query({ args: { streamCallId: v.string() }, handler: async (ctx, { streamCallId }) => {
  const user = await requireUser(ctx);
  if (streamCallId.length > 200) return null;
  const call = await ctx.db.query("calls").withIndex("by_stream_call", q => q.eq("streamCallId", streamCallId)).unique();
  return call && [call.callerId, call.receiverId].includes(user._id) ? view(ctx, call, user._id) : null;
} });
export const current = query({ args: {}, handler: async ctx => {
  const user = await requireUser(ctx);
  const call = (await activeCalls(ctx, user._id)).find(c => c.provisioned);
  return call ? view(ctx, call, user._id) : null;
} });
export const history = query({
  args: { direction: v.union(v.literal("incoming"), v.literal("outgoing")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { direction, paginationOpts }) => {
    const user = await requireUser(ctx);
    if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) throw new ConvexError("INVALID_PAGE_SIZE");
    const side = direction === "incoming" ? "receiver" : "caller";
    const source = historyListsReady()
      ? ctx.db.query("calls").withIndex(`by_${side}_visible_created`, q => q.eq(`${side}Id`, user._id).eq(`${side}HistoryVisible`, true))
      : ctx.db.query("calls").withIndex(`by_${side}_created`, q => q.eq(`${side}Id`, user._id));
    const result = await source.order("desc")
      .paginate({ ...paginationOpts, maximumRowsRead: 50 });
    return { ...result, page: await Promise.all(result.page.filter(c => c[`${side}HistoryVisible`] !== false).map(c => view(ctx, c, user._id))) };
  },
});
export const deleteHistory = mutation({ args: { callIds: v.array(v.id("calls")) }, handler: async (ctx, { callIds }) => {
  const user = await requireUser(ctx);
  validateDeleteIds(callIds);
  const calls = await Promise.all(callIds.map(id => ctx.db.get("calls", id)));
  if (calls.some(call => !call || ![call.callerId, call.receiverId].includes(user._id))) throw new ConvexError("CALL_UNAVAILABLE");
  if (calls.some(call => liveCall(call))) throw new ConvexError("CALL_HISTORY_ACTIVE");
  for (const call of calls) {
    if (!call) continue;
    const field = call.callerId === user._id ? "callerHistoryVisible" : "receiverHistoryVisible";
    if (call[field] !== false) await ctx.db.patch("calls", call._id, { [field]: false });
  }
} });
export const decline = mutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const { call, user } = await owned(ctx, callId);
  if (call.receiverId !== user._id) throw new ConvexError("CALL_UNAVAILABLE");
  if (call.status === "ringing") await finish(ctx, call, "rejected", "declined");
} });
export const cancel = mutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const { call, user } = await owned(ctx, callId);
  if (call.callerId !== user._id) throw new ConvexError("CALL_UNAVAILABLE");
  if (call.status === "ringing") await finish(ctx, call, "ended", "cancelled");
} });
export const end = mutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const { call } = await owned(ctx, callId); await finish(ctx, call, "ended", call.status === "accepted" ? "completed" : "cancelled");
} });
export const expire = internalMutation({ args: callArgs, handler: async (ctx, { callId }) => {
  const call = await ctx.db.get("calls", callId);
  if (call?.status === "ringing" && call.ringDeadline <= Date.now()) await finish(ctx, call, "missed", "unanswered");
} });
export const applyEvent = internalMutation({ args: { streamCallId: v.string(), event: v.any() }, handler: async (ctx, { streamCallId, event }) => {
  const call = await ctx.db.query("calls").withIndex("by_stream_call", q => q.eq("streamCallId", streamCallId)).unique();
  if (!call) return;
  const patch = callEventPatch(call, event, Date.now());
  // Only a verified session join starts duration; acceptance alone is not audio connectivity.
  if (liveCall(call) && event.type === "call.session_participant_joined" && event.participant?.user?.id === call.receiverId) {
    if (!call.startedAt) await ctx.db.patch("calls", call._id, { status: "accepted", startedAt: Date.now() });
  }
  if (patch) {
    await ctx.db.patch("calls", call._id, patch);
    if (patch.cleanupPending) await ctx.scheduler.runAfter(0, internal.streamCalls.closeCall, { callId: call._id });
  }
} });
export const cleanupInfo = internalQuery({ args: callArgs, handler: (ctx, { callId }) => ctx.db.get("calls", callId) });
export const cleanupResult = internalMutation({ args: { ...callArgs, success: v.boolean() }, handler: async (ctx, { callId, success }) => {
  const call = await ctx.db.get("calls", callId); if (!call?.cleanupPending) return;
  const attempts = (call.cleanupAttempts ?? 0) + 1;
  await ctx.db.patch("calls", callId, { cleanupPending: !success, cleanupAttempts: attempts });
  if (!success && attempts < 5) await ctx.scheduler.runAfter(Math.min(60_000, 2000 * 2 ** attempts), internal.streamCalls.closeCall, { callId });
} });
export const recover = internalMutation({ args: {}, handler: async ctx => {
  const overdue = await ctx.db.query("calls").withIndex("by_status_deadline", q => q.eq("status", "ringing").lte("ringDeadline", Date.now())).take(50);
  for (const call of overdue) await finish(ctx, call, "missed", "unanswered");
  const pending = await ctx.db.query("calls").withIndex("by_cleanup", q => q.eq("cleanupPending", true)).take(50);
  for (const call of pending) await ctx.scheduler.runAfter(0, internal.streamCalls.closeCall, { callId: call._id });
} });

export async function stopBlockedCalls(ctx, blockerId, blockedId) {
  for (const call of await activeCalls(ctx, blockerId)) {
    if ([call.callerId, call.receiverId].includes(blockedId)) await finish(ctx, call, "ended", "unavailable");
  }
}
