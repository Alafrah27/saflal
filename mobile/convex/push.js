// @ts-check
/// <reference types="node" />
import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { deliveryPayload } from "./lib/push.js";

const id = v.id("pushDeliveries");
const work = v.object({ deliveryId: id, attempt: v.number() });
const receiptWork = v.object({ deliveryId: id, attempt: v.number(), sendAttempt: v.number() });
const outcomes = v.union(v.literal("submitted"), v.literal("retry"), v.literal("resend"), v.literal("failed"),
  v.literal("suppressed"), v.literal("complete"));
const payloadValidator = v.object({
  to: v.string(), title: v.string(), body: v.string(),
  data: v.object({ eventId: id, type: v.string(), recipientId: v.id("users"),
    requestId: v.optional(v.id("friendRequests")), messageId: v.optional(v.id("messages")), chatId: v.optional(v.id("chats")) }),
  sound: v.string(), channelId: v.string(), priority: v.string(), ttl: v.number(),
});

export const payload = internalQuery({
  args: { deliveryId: id, attempt: v.number() }, returns: v.union(v.null(), payloadValidator),
  handler: async (ctx, { deliveryId, attempt }) => {
    const row = await ctx.db.get("pushDeliveries", deliveryId);
    if (!row || row.status !== "sending" || row.attempts !== attempt) return null;
    return await deliveryPayload(ctx, row);
  },
});

export const receiptTicket = internalQuery({
  args: { deliveryId: id, attempt: v.number(), sendAttempt: v.number() }, returns: v.union(v.null(), v.string()),
  handler: async (ctx, { deliveryId, attempt, sendAttempt }) => {
    const row = await ctx.db.get("pushDeliveries", deliveryId);
    return row?.status === "submitted" && row.receiptAttempts === attempt && row.attempts === sendAttempt ? row.ticketId ?? null : null;
  },
});

export const prepare = internalQuery({
  args: { jobs: v.array(work) },
  returns: v.array(v.object({ deliveryId: id, attempt: v.number(), message: v.union(v.null(), payloadValidator) })),
  handler: async (ctx, { jobs }) => {
    if (jobs.length > 100) throw new Error("PUSH_BATCH_TOO_LARGE");
    return await Promise.all(jobs.map(async job => {
      const row = await ctx.db.get("pushDeliveries", job.deliveryId);
      const message = row?.status === "sending" && row.attempts === job.attempt ? await deliveryPayload(ctx, row) : null;
      return { ...job, message };
    }));
  },
});

export const finish = internalMutation({
  args: { deliveryId: id, attempt: v.number(), receipt: v.boolean(), outcome: outcomes,
    sendAttempt: v.optional(v.number()),
    ticketId: v.optional(v.string()), errorCode: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get("pushDeliveries", args.deliveryId);
    if (!row || row.status !== (args.receipt ? "submitted" : "sending") ||
      (args.receipt ? row.receiptAttempts : row.attempts) !== args.attempt ||
      (args.receipt && row.attempts !== args.sendAttempt)) return null;
    const now = Date.now();
    if (args.errorCode === "DeviceNotRegistered") {
      const device = await ctx.db.get("devices", row.deviceId);
      if (device?.isActive && device.userId === row.recipientId &&
        (device.registrationVersion ?? 0) === row.registrationVersion) {
        await ctx.db.patch("devices", device._id, {
          isActive: false, registrationVersion: (device.registrationVersion ?? 0) + 1, updatedAt: now,
        });
      }
    }
    // A receipt rate-limit error means the provider rejected this send. Retry
    // sending rather than polling the same failed ticket indefinitely.
    const resend = args.receipt && args.outcome === "resend";
    const retry = resend ? row.attempts < 5 : args.outcome === "retry" && args.attempt < 5;
    const status = retry ? (args.receipt && !resend ? "submitted" : "pending") :
      args.outcome === "retry" || args.outcome === "resend" ? "failed" : args.outcome;
    const delay = args.receipt && !resend ? 15 * 60000 : Math.min(10 * 60000, 10000 * 3 ** (row.attempts - 1));
    await ctx.db.patch("pushDeliveries", row._id, {
      status, updatedAt: now, dueAt: now + (retry ? delay : args.outcome === "submitted" ? 15 * 60000 : 0),
      ...(resend ? { ticketId: undefined, receiptAttempts: 0 } :
        args.ticketId ? { ticketId: args.ticketId, receiptAttempts: 0 } : {}),
      errorCode: args.errorCode,
    });
    return null;
  },
});

export const tick = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const now = Date.now(), sends = [], receipts = [];
    let remaining = 100;
    for (const status of /** @type {const} */ (["sending", "pending"])) {
      if (!remaining) break;
      const rows = await ctx.db.query("pushDeliveries")
        .withIndex("by_status_due", q => q.eq("status", status).lte("dueAt", now)).take(remaining);
      remaining -= rows.length;
      for (const row of rows) {
        if (row.attempts >= 5) {
          await ctx.db.patch("pushDeliveries", row._id, { status: "failed", errorCode: "AttemptsExhausted", updatedAt: now });
          continue;
        }
        const attempt = row.attempts + 1;
        await ctx.db.patch("pushDeliveries", row._id, { status: "sending", attempts: attempt, dueAt: now + 5 * 60000, updatedAt: now });
        sends.push({ deliveryId: row._id, attempt });
      }
    }
    const submitted = await ctx.db.query("pushDeliveries")
      .withIndex("by_status_due", q => q.eq("status", "submitted").lte("dueAt", now)).take(100);
    for (const row of submitted) {
      if (row.receiptAttempts >= 5) {
        await ctx.db.patch("pushDeliveries", row._id, { status: "failed", errorCode: "ReceiptUnavailable", updatedAt: now });
        continue;
      }
      const attempt = row.receiptAttempts + 1;
      await ctx.db.patch("pushDeliveries", row._id, { receiptAttempts: attempt, dueAt: now + 5 * 60000, updatedAt: now });
      receipts.push({ deliveryId: row._id, attempt, sendAttempt: row.attempts });
    }
    if (sends.length) await ctx.scheduler.runAfter(0, internal.push.dispatch, { jobs: sends });
    if (receipts.length) await ctx.scheduler.runAfter(0, internal.push.checkReceipts, { jobs: receipts });
    return null;
  },
});

/** @param {string} path @param {unknown} body */
async function expoRequest(path, body) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return { retry: response.status === 429 || response.status >= 500, errorCode: `HTTP_${response.status}` };
  return { data: (await response.json()).data };
}

export const dispatch = internalAction({
  args: { jobs: v.array(work) }, returns: v.null(),
  handler: async (ctx, { jobs }) => {
    if (jobs.length > 100) throw new Error("PUSH_BATCH_TOO_LARGE");
    const eligible = [];
    const prepared = await ctx.runQuery(internal.push.prepare, { jobs });
    for (const { message, ...job } of prepared) {
      if (message) eligible.push({ job, message });
      else await ctx.runMutation(internal.push.finish, { ...job, receipt: false, outcome: "suppressed" });
    }
    if (!eligible.length) return null;
    let result;
    try { result = await expoRequest("send", eligible.map(entry => entry.message)); }
    catch { result = { retry: true, errorCode: "NetworkError" }; }
    for (let index = 0; index < eligible.length; index++) {
      const ticket = Array.isArray(result.data) ? result.data[index] : undefined;
      const outcome = ticket?.status === "ok" && typeof ticket.id === "string" ? "submitted" :
        result.retry || ticket?.details?.error === "MessageRateExceeded" ? "retry" : "failed";
      const code = ticket?.details?.error;
      await ctx.runMutation(internal.push.finish, {
        ...eligible[index].job, receipt: false, outcome,
        ...(outcome === "submitted" ? { ticketId: ticket.id } : { errorCode: typeof code === "string" ? code.slice(0, 80) : result.errorCode ?? "InvalidPushResponse" }),
      });
    }
    return null;
  },
});

export const checkReceipts = internalAction({
  args: { jobs: v.array(receiptWork) }, returns: v.null(),
  handler: async (ctx, { jobs }) => {
    if (jobs.length > 100) throw new Error("PUSH_BATCH_TOO_LARGE");
    const eligible = [];
    for (const job of jobs) {
      const ticket = await ctx.runQuery(internal.push.receiptTicket, job);
      if (ticket) eligible.push({ job, ticket });
    }
    if (!eligible.length) return null;
    let result;
    try { result = await expoRequest("getReceipts", { ids: eligible.map(entry => entry.ticket) }); }
    catch { result = { retry: true, errorCode: "NetworkError" }; }
    for (const { job, ticket } of eligible) {
      const receipt = result.data?.[ticket];
      const code = receipt?.details?.error;
      const outcome = receipt?.status === "ok" ? "complete" : code === "MessageRateExceeded" ? "resend" :
        result.retry || (!result.errorCode && !receipt) ? "retry" : "failed";
      await ctx.runMutation(internal.push.finish, {
        ...job, receipt: true, outcome,
        ...(outcome !== "complete" ? { errorCode: typeof code === "string" ? code.slice(0, 80) : result.errorCode ?? "ReceiptUnavailable" } : {}),
      });
    }
    return null;
  },
});

export const cleanup = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const cutoff = Date.now() - 7 * 86400000;
    let remaining = 100;
    for (const status of /** @type {const} */ (["complete", "failed", "suppressed"])) {
      if (!remaining) break;
      const rows = await ctx.db.query("pushDeliveries")
        .withIndex("by_status_updated", q => q.eq("status", status).lt("updatedAt", cutoff)).take(remaining);
      for (const row of rows) await ctx.db.delete("pushDeliveries", row._id);
      remaining -= rows.length;
    }
    return null;
  },
});
