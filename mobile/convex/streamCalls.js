"use node";
import { StreamClient } from "@stream-io/node-sdk";
import { gunzipSync } from "node:zlib";
import { Buffer } from "node:buffer";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { CALL_TYPE, liveCall } from "./lib/callPolicy.js";
import { validStreamPolicy } from "./lib/streamPolicy.js";
import { displayName } from "../shared/displayName.js";

function server() {
  const key = process.env.STREAM_API_KEY, secret = process.env.STREAM_API_SECRET;
  if (!key || !secret) throw new ConvexError("CALLS_CREDENTIALS_NOT_CONFIGURED");
  return { client: new StreamClient(key, secret), key };
}

export const syncNotificationPreference = internalAction({
  args: { userId: v.id("users"), version: v.number(), attempt: v.number() },
  handler: async (ctx, args) => {
    let success = false;
    try {
      const preference = await ctx.runQuery(internal.users.notificationPreference, { userId: args.userId, version: args.version });
      if (!preference) return;
      const { client } = server();
      await client.upsertUsers([{ id: preference.userId, role: "user", name: displayName(preference),
        ...(preference.imageUrl ? { image: preference.imageUrl } : {}) }]);
      await client.updatePushNotificationPreferences({ preferences: [{ user_id: preference.userId,
        call_level: preference.enabled ? "all" : "none" }] });
      success = true;
    } catch { /* Retry query/provider failures without logging private data. */ }
    await ctx.runMutation(internal.users.notificationSyncResult, { ...args, success });
  },
});
// Fail closed until the dedicated Saflal application's permissions are hardened.
// A user token must never grant a route around Convex's friendship/block checks.
export async function verifyCallPermissions(client) {
  const { call_types: types } = await client.video.listCallTypes();
  if (!validStreamPolicy(types)) throw new ConvexError("CALLS_PERMISSIONS_NOT_CONFIGURED");
}
export const getStreamSession = action({ args: {}, handler: async ctx => {
  const user = await ctx.runQuery(internal.calls.sessionUser, {});
  const { client, key } = server();
  try {
    await verifyCallPermissions(client);
    await client.upsertUsers([{ id: user._id, role: "user", name: displayName(user), ...(user.imageUrl ? { image: user.imageUrl } : {}) }]);
    return { apiKey: key, user: { id: user._id, name: displayName(user), ...(user.imageUrl ? { image: user.imageUrl } : {}) },
      token: client.generateUserToken({ user_id: user._id, validity_in_seconds: 4 * 60 * 60 }) };
  } catch (error) {
    if (error instanceof ConvexError) throw error;
    throw new ConvexError("CALL_SERVICE_UNAVAILABLE");
  }
} });
export const startCall = action({ args: { chatId: v.id("chats"), requestId: v.string() }, handler: async (ctx, args) => {
  const { client } = server();
  await verifyCallPermissions(client);
  const { call, fresh } = await ctx.runMutation(internal.calls.reserve, args);
  if (!call) throw new ConvexError("CALL_UNAVAILABLE");
  if (!fresh) {
    if (!liveCall(call)) throw new ConvexError(call.status === "failed" ? "CALL_CONNECTION_FAILED" : "CALL_UNAVAILABLE");
    if (!call.provisioned) throw new ConvexError("CALL_BUSY");
    return { callId: call._id, streamCallId: call.streamCallId, type: CALL_TYPE };
  }
  let stage = "authorize";
  try {
    const info = await ctx.runQuery(internal.calls.provisionInfo, { callId: call._id });
    if (!info) throw Error("UNAVAILABLE");
    stage = "users";
    await client.upsertUsers([info.me, info.peer].map(u => ({ id: u._id, role: "user", name: displayName(u), ...(u.imageUrl ? { image: u.imageUrl } : {}) })));
    // The authorized caller watches/rings this existing call from its call screen.
    // get({ring:true}) gives the caller the SDK's ringing lifecycle as well.
    stage = "create";
    await client.video.call(CALL_TYPE, call.streamCallId).getOrCreate({ ring: false, video: false,
      data: { created_by_id: call.callerId, members: [{ user_id: call.callerId }, { user_id: call.receiverId }],
        // Inherit the audio-only settings validated immediately above. Partial
        // video overrides omit resolution fields required by Stream validation.
        custom: { convexCallId: call._id } } });
    stage = "finalize";
    const ready = await ctx.runMutation(internal.calls.markProvisioned, { callId: call._id });
    if (!ready) { await client.video.call(CALL_TYPE, call.streamCallId).end(); throw Error("UNAVAILABLE"); }
    return { callId: call._id, streamCallId: call.streamCallId, type: CALL_TYPE };
  } catch (error) {
    // Never log the SDK error/request object: it can include authorization,
    // user information and API credentials. Emit only bounded diagnostic codes.
    console.error("CALL_PROVISION_FAILED", { stage,
      streamCode: Number.isInteger(error?.code) ? error.code : null,
      status: Number.isInteger(error?.statusCode) ? error.statusCode : null,
      resolutionValidation: typeof error?.message === "string" && error.message.includes("target_resolution"),
    });
    await ctx.runMutation(internal.calls.fail, { callId: call._id });
    throw new ConvexError("CALL_CONNECTION_FAILED");
  }
} });
export const closeCall = internalAction({ args: { callId: v.id("calls") }, handler: async (ctx, { callId }) => {
  const call = await ctx.runQuery(internal.calls.cleanupInfo, { callId });
  if (!call?.cleanupPending) return;
  let success = false;
  try {
    const { client } = server();
    await client.video.call(CALL_TYPE, call.streamCallId).end(); success = true;
  } catch (error) { success = error?.statusCode === 404; }
  await ctx.runMutation(internal.calls.cleanupResult, { callId, success });
} });
export const processWebhook = internalAction({ args: { body: v.bytes(), signature: v.string() }, handler: async (ctx, { body, signature }) => {
  const { client } = server();
  let event;
  const raw = Buffer.from(body), compressed = raw[0] === 0x1f && raw[1] === 0x8b;
  try {
    if (raw.length > 256 * 1024) return false;
    // Bound decompression before delegating HMAC/JSON validation to Stream.
    const payload = compressed ? gunzipSync(raw, { maxOutputLength: 256 * 1024 }) : raw;
    event = client.verifyAndParseWebhook(payload, signature);
  } catch (error) {
    const known = ["signature mismatch", "gzip decompression failed", "invalid JSON payload"];
    console.error("CALL_WEBHOOK_REJECTED", { compressed,
      reason: known.includes(error?.message) ? error.message : "invalid_payload" });
    return false;
  }
  const cid = event.call_cid;
  if (typeof cid !== "string" || !cid.startsWith(`${CALL_TYPE}:`)) return true;
  await ctx.runMutation(internal.calls.applyEvent, { streamCallId: cid.slice(CALL_TYPE.length + 1), event });
  return true;
} });
