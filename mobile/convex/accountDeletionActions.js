"use node";
import { randomUUID } from "node:crypto";
import { StreamClient } from "@stream-io/node-sdk";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";

function services() {
  const key = process.env.STREAM_API_KEY, secret = process.env.STREAM_API_SECRET, clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!key || !secret || !clerkSecret) throw new ConvexError("ACCOUNT_DELETE_UNAVAILABLE");
  return { client: new StreamClient(key, secret, { timeout: 15_000 }), clerkSecret };
}
async function clerkRequest(clerkId, secret, method) {
  return await fetch("https://api.clerk.com/v1/users/" + encodeURIComponent(clerkId), {
    method, headers: { Authorization: "Bearer " + secret }, signal: AbortSignal.timeout(15_000),
  });
}
async function streamUser(client, userId) {
  const result = await client.queryUsers({ payload: { filter_conditions: { id: { $eq: userId } },
    include_deactivated_users: true, limit: 1 } });
  return result.users[0];
}

// No client-supplied identity. Preflight credentials before making access irreversible.
export const request = action({ args: { confirmation: v.literal("DELETE") }, handler: async ctx => {
  const owner = await ctx.runQuery(internal.accountDeletion.owner, {});
  if (!owner.requested) {
    try {
      const { client, clerkSecret } = services();
      const response = await clerkRequest(owner.clerkId, clerkSecret, "GET");
      if (!response.ok) throw Error("UNAVAILABLE");
      await streamUser(client, owner.userId);
    } catch { throw new ConvexError("ACCOUNT_DELETE_UNAVAILABLE"); }
  }
  return await ctx.runMutation(internal.accountDeletion.begin, {});
} });

export const run = internalAction({ args: { jobId: v.id("accountDeletions") }, handler: async (ctx, { jobId }) => {
  const lease = randomUUID();
  const job = await ctx.runMutation(internal.accountDeletion.claim, { jobId, lease });
  if (!job) return;
  const progress = patch => ctx.runMutation(internal.accountDeletion.progress, { jobId, lease, ...patch });
  let failed = false;
  try {
    const { client, clerkSecret } = services();
    // Independent checkpoints: one provider outage must not prevent the other cleanup.
    if (!job.clerkDone) {
      try {
        const response = await clerkRequest(job.clerkId, clerkSecret, "DELETE");
        if (!response.ok && response.status !== 404) throw Error("UNAVAILABLE");
        await progress({ clerkDone: true });
      } catch { failed = true; }
    }
    if (!job.streamDone) {
      try {
        if (job.streamTaskId) {
          let task;
          try { task = await client.getTask({ id: job.streamTaskId }); }
          catch (error) {
            if (error?.statusCode === 404) await progress({ streamTaskId: null });
            throw error;
          }
          if (task.status === "completed" && !task.error) await progress({ streamDone: true });
          else if (task.status === "failed" || task.error) { await progress({ streamTaskId: null }); failed = true; }
        } else {
          const user = await streamUser(client, job.userId);
          if (!user || user.deleted_at) await progress({ streamDone: true });
          else {
            if (!user.deactivated_at) await client.deactivateUser({ user_id: job.userId });
            // Pruning removes personal metadata and prevents ID reuse; preserve shared call records.
            const result = await client.deleteUsers({ user_ids: [job.userId], user: "pruning" });
            if (!result.task_id) throw Error("UNAVAILABLE");
            await progress({ streamTaskId: result.task_id });
          }
        }
      } catch { failed = true; }
    }
  } catch { failed = true; }
  // A crash before this release is recovered by the expiring lease and cron.
  await progress({ release: true, failed });
} });
