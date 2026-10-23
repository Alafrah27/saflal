import { ConvexError } from "convex/values";

export async function requireIdentity(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  return identity;
}

export async function findUser(ctx, clerkId) {
  return await ctx.db.query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique();
}

export async function requireUser(ctx) {
  const identity = await requireIdentity(ctx);
  const user = await findUser(ctx, identity.subject);
  if (!user) throw new ConvexError("PROFILE_REQUIRED");
  if (!user.isActive) throw new ConvexError("ACCOUNT_INACTIVE");
  return user;
}
