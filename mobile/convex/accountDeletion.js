import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { findUser, requireIdentity } from "./auth.js";
import { activeCalls } from "./lib/callPolicy.js";

const jobArgs = { jobId: v.id("accountDeletions") };
const cleanupSteps = [
  ["devices", "by_user", "userId"],
  ["friendRequests", "by_sender", "senderId"], ["friendRequests", "by_receiver", "receiverId"],
  ["friendships", "by_user1", "user1Id"], ["friendships", "by_user2", "user2Id"],
  ["blockedUsers", "by_blocker", "blockerId"], ["blockedUsers", "by_blocked", "blockedId"],
  ["pushDeliveries", "by_actor", "actorId"], ["pushDeliveries", "by_recipient", "recipientId"],
  ["audioUploads", "by_owner_key", "ownerId"],
];

async function ownProfile(ctx) {
  const identity = await requireIdentity(ctx);
  const user = await findUser(ctx, identity.subject);
  if (!user || (!user.isActive && user.deletedAt === undefined)) throw new ConvexError("ACCOUNT_UNAVAILABLE");
  return user;
}

export const owner = internalQuery({ args: {}, handler: async ctx => {
  const user = await ownProfile(ctx);
  return { userId: user._id, clerkId: user.clerkId, requested: user.deletedAt !== undefined };
} });

export const begin = internalMutation({ args: {}, handler: async ctx => {
  const user = await ownProfile(ctx);
  const existing = await ctx.db.query("accountDeletions").withIndex("by_user", q => q.eq("userId", user._id)).unique();
  if (existing) return { accepted: true };
  if ((await activeCalls(ctx, user._id)).length) throw new ConvexError("ACCOUNT_DELETE_ACTIVE_CALL");
  const now = Date.now();
  // Keep only a non-reusable identity tombstone for shared history and old JWTs.
  await ctx.db.patch("users", user._id, { fullName: "Deleted user", nickName: undefined, imageUrl: undefined, bio: undefined, verifiedEmail: undefined,
    isActive: false, deletedAt: now, isOnline: false, lastSeenAt: undefined,
    showOnlineStatus: false, showLastSeen: false, notificationsEnabled: false,
    notificationSyncStatus: undefined, updatedAt: now });
  const jobId = await ctx.db.insert("accountDeletions", { userId: user._id, clerkId: user.clerkId,
    status: "pending", localStep: 0, localDone: false, clerkDone: false, streamDone: false,
    attempts: 0, dueAt: now, createdAt: now });
  await ctx.scheduler.runAfter(0, internal.accountDeletion.cleanup, { jobId });
  await ctx.scheduler.runAfter(0, internal.accountDeletionActions.run, { jobId });
  return { accepted: true };
} });

async function complete(ctx, job) {
  if (!job.localDone || !job.clerkDone || !job.streamDone) return false;
  await ctx.db.patch("accountDeletions", job._id, { status: "complete", localDone: true, clerkDone: true, streamDone: true, clerkId: undefined,
    streamTaskId: undefined, dueAt: undefined, lease: undefined, leaseUntil: undefined, completedAt: Date.now() });
  return true;
}

export const cleanup = internalMutation({ args: jobArgs, handler: async (ctx, { jobId }) => {
  const job = await ctx.db.get("accountDeletions", jobId);
  if (!job || job.status === "complete" || job.localDone) return;
  const [table, index, field] = cleanupSteps[job.localStep];
  const rows = await ctx.db.query(table).withIndex(index, q => q.eq(field, job.userId)).take(25);
  for (const row of rows) {
    if (table === "audioUploads" && row.storageId) {
      const message = await ctx.db.query("messages").withIndex("by_audio_storage", q => q.eq("audioStorageId", row.storageId)).first();
      if (!message) await ctx.storage.delete(row.storageId);
    }
    await ctx.db.delete(table, row._id);
  }
  const localStep = job.localStep + (rows.length < 25 ? 1 : 0);
  const localDone = localStep === cleanupSteps.length;
  await ctx.db.patch("accountDeletions", jobId, { localStep, localDone });
  if (!await complete(ctx, { ...job, localStep, localDone }) && !localDone)
    await ctx.scheduler.runAfter(0, internal.accountDeletion.cleanup, { jobId });
} });

export const claim = internalMutation({ args: { ...jobArgs, lease: v.string() }, handler: async (ctx, { jobId, lease }) => {
  const job = await ctx.db.get("accountDeletions", jobId), now = Date.now();
  if (!job || job.status === "complete" || (job.leaseUntil ?? 0) > now || (job.clerkDone && job.streamDone)) return null;
  const user = await ctx.db.get("users", job.userId);
  if (!user || user.isActive || user.deletedAt === undefined || user.clerkId !== job.clerkId) return null;
  await ctx.db.patch("accountDeletions", jobId, { lease, leaseUntil: now + 120_000, dueAt: now + 120_000 });
  return job;
} });

export const progress = internalMutation({ args: { ...jobArgs, lease: v.string(),
  clerkDone: v.optional(v.boolean()), streamDone: v.optional(v.boolean()),
  streamTaskId: v.optional(v.union(v.string(), v.null())), release: v.optional(v.boolean()), failed: v.optional(v.boolean()) },
handler: async (ctx, args) => {
  const job = await ctx.db.get("accountDeletions", args.jobId);
  if (!job || job.status === "complete" || job.lease !== args.lease) return;
  const patch = {};
  if (args.clerkDone) patch.clerkDone = true;
  if (args.streamDone) patch.streamDone = true;
  if (args.streamTaskId !== undefined) patch.streamTaskId = args.streamTaskId ?? undefined;
  if (await complete(ctx, { ...job, ...patch })) return;
  if (args.release) {
    const attempts = args.failed ? job.attempts + 1 : 0;
    const delay = args.failed ? Math.min(3_600_000, 5000 * 2 ** Math.min(attempts, 10)) : 15_000;
    Object.assign(patch, { attempts, dueAt: Date.now() + delay, lease: undefined, leaseUntil: undefined });
    await ctx.scheduler.runAfter(delay, internal.accountDeletionActions.run, { jobId: job._id });
  }
  await ctx.db.patch("accountDeletions", job._id, patch);
} });

export const recover = internalMutation({ args: {}, handler: async ctx => {
  const jobs = await ctx.db.query("accountDeletions").withIndex("by_due", q => q.gt("dueAt", 0).lte("dueAt", Date.now())).take(10);
  for (const job of jobs) {
    if (job.status === "complete") continue;
    if (!job.localDone) await ctx.scheduler.runAfter(0, internal.accountDeletion.cleanup, { jobId: job._id });
    if (!job.clerkDone || !job.streamDone) await ctx.scheduler.runAfter(0, internal.accountDeletionActions.run, { jobId: job._id });
    await ctx.db.patch("accountDeletions", job._id, { dueAt: Date.now() + 120_000 });
  }
} });
