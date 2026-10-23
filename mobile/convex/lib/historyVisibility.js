import { ConvexError } from "convex/values";

export function validateDeleteIds(ids) {
  if (ids.length < 1 || ids.length > 50 || new Set(ids).size !== ids.length)
    throw new ConvexError("DELETE_REQUIRES_1_TO_50_UNIQUE_IDS");
}

// Index order is createdAt, then Convex's unique _creationTime. A wall-clock
// cutoff alone would also clear a message committed later in the same millisecond.
export function messageVisible(message, membership) {
  const cutoff = membership?.clearedThrough;
  return !cutoff || message.createdAt > cutoff.createdAt ||
    (message.createdAt === cutoff.createdAt && message._creationTime > cutoff.creationTime);
}

// A committed message cursor distinguishes messages sent in the same millisecond.
// Older accounts retain their existing timestamp receipt until their next read.
export function messageRead(message, membership) {
  if (membership?.readThrough) return !messageVisible(message, { clearedThrough: membership.readThrough });
  return membership?.lastReadAt !== undefined
    ? message.createdAt <= membership.lastReadAt : message.status === "read";
}

export const historyListsReady = () => process.env.HISTORY_LISTS_READY === "true";
