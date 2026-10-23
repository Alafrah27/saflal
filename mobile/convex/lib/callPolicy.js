import { ConvexError } from "convex/values";
import { areFriends, loadChat } from "../chats.js";
import { hasBlockingRelationship } from "./blocking.js";

export const CALL_TYPE = "saflal_audio";
export const RING_MS = 30_000;
export const liveCall = call => call && ["ringing", "accepted"].includes(call.status);
export const validCallRequest = id => typeof id === "string" && /^[a-zA-Z0-9_-]{16,100}$/.test(id);

export async function authorizePair(ctx, chatId, userId) {
  const loaded = await loadChat(ctx, chatId, userId);
  if (!loaded) throw new ConvexError("CALL_UNAVAILABLE");
  const [me, peer, friends, blocked] = await Promise.all([
    ctx.db.get("users", userId), ctx.db.get("users", loaded.peerId),
    areFriends(ctx, userId, loaded.peerId), hasBlockingRelationship(ctx, userId, loaded.peerId),
  ]);
  if (!me?.isActive || !peer?.isActive || !friends || blocked) throw new ConvexError("CALL_UNAVAILABLE");
  return { me, peer };
}

export async function activeCalls(ctx, userId) {
  const rows = await Promise.all(["caller", "receiver"].flatMap(side => ["ringing", "accepted"].map(status =>
    ctx.db.query("calls").withIndex(`by_${side}_status`, q => q.eq(`${side}Id`, userId).eq("status", status)).take(2)
  )));
  return rows.flat();
}

// A terminal call never becomes live again because an older webhook arrives.
export function callEventPatch(call, event, now) {
  if (!liveCall(call)) return null;
  const at = Date.parse(event.created_at ?? "");
  const eventAt = Number.isFinite(at) ? Math.min(at, now) : now;
  if (eventAt < (call.lastEventAt ?? 0)) return null;
  const userId = event.user?.id;
  let status, outcome;
  if (event.type === "call.accepted" && userId === call.receiverId) status = "accepted";
  if (event.type === "call.rejected") {
    if (userId === call.receiverId) { status = "rejected"; outcome = event.reason === "busy" ? "busy" : "declined"; }
    if (userId === call.callerId) { status = "ended"; outcome = "cancelled"; }
  }
  if (event.type === "call.missed" && call.status === "ringing") { status = "missed"; outcome = "unanswered"; }
  if (["call.ended", "call.session_ended"].includes(event.type)) {
    status = "ended"; outcome = call.status === "accepted" ? "completed" : "cancelled";
  }
  if (!status || (call.status === "accepted" && ["rejected", "missed"].includes(status))) return null;
  return { status, lastEventAt: eventAt,
    ...(status === "accepted" ? {} : { outcome, endedAt: now, cleanupPending: true }),
  };
}
