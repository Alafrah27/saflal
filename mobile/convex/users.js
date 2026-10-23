import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v, ConvexError } from "convex/values";
import { requireIdentity, requireUser, findUser } from "./auth.js";
import { normalizeFullName, normalizeNickName, normalizeProfileImageUrl } from "./profileValidation.js";
import { BIO_LIMIT } from "../shared/displayName.js";
import { primaryVerifiedEmail } from "./lib/clerkProfile.js";
import { directoryOrderKey } from "../shared/contactOrder.js";

export const current = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    return identity ? await findUser(ctx, identity.subject) : null;
  },
});

// One account preference covers every registered device. Missing means enabled
// for existing accounts; changes never trust a caller-supplied user ID.
export const setNotifications = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const user = await requireUser(ctx);
    if (user.notificationSyncStatus === "pending") {
      if ((user.notificationsEnabled !== false) === enabled) return;
      throw new ConvexError("NOTIFICATION_UPDATE_PENDING");
    }
    if (user.notificationSyncStatus === "synced" && (user.notificationsEnabled !== false) === enabled) return;
    const version = (user.notificationSettingsVersion ?? 0) + 1;
    await ctx.db.patch("users", user._id, { notificationsEnabled: enabled, notificationSettingsVersion: version,
      notificationSyncStatus: "pending", updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.streamCalls.syncNotificationPreference, { userId: user._id, version, attempt: 0 });
  },
});

export const notificationPreference = internalQuery({
  args: { userId: v.id("users"), version: v.number() },
  handler: async (ctx, { userId, version }) => {
    const user = await ctx.db.get("users", userId);
    if (!user?.isActive || user.notificationSettingsVersion !== version || user.notificationSyncStatus !== "pending") return null;
    return { userId: user._id, fullName: user.fullName, ...(user.nickName ? { nickName: user.nickName } : {}), ...(user.imageUrl ? { imageUrl: user.imageUrl } : {}), enabled: user.notificationsEnabled !== false };
  },
});

export const notificationSyncResult = internalMutation({
  args: { userId: v.id("users"), version: v.number(), attempt: v.number(), success: v.boolean() },
  handler: async (ctx, { userId, version, attempt, success }) => {
    const user = await ctx.db.get("users", userId);
    if (!user?.isActive) return;
    if (user.notificationSettingsVersion !== version) {
      // A late provider response must converge to the latest saved preference.
      if (success && user.notificationSettingsVersion !== undefined) {
        await ctx.db.patch("users", userId, { notificationSyncStatus: "pending" });
        await ctx.scheduler.runAfter(0, internal.streamCalls.syncNotificationPreference,
          { userId, version: user.notificationSettingsVersion, attempt: 0 });
      }
      return;
    }
    if (user.notificationSyncStatus !== "pending") return;
    if (success) await ctx.db.patch("users", userId, { notificationSyncStatus: "synced" });
    else if (attempt < 4) await ctx.scheduler.runAfter(1000 * 2 ** attempt, internal.streamCalls.syncNotificationPreference,
      { userId, version, attempt: attempt + 1 });
    else await ctx.db.patch("users", userId, { notificationSyncStatus: "failed" });
  },
});

export const completeProfile = mutation({
  args: { fullName: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await findUser(ctx, identity.subject);
    if (existing) {
      if (!existing.isActive) throw new ConvexError("ACCOUNT_INACTIVE");
      return existing._id;
    }
    const fullName = normalizeFullName(args.fullName);
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject, fullName,
      isOnline: false, showOnlineStatus: true, showLastSeen: true,
      isActive: true, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(userId, { directoryOrderKey: directoryOrderKey(userId) });
    return userId;
  },
});

export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()), nickName: v.optional(v.string()), bio: v.optional(v.string()),
    showOnlineStatus: v.optional(v.boolean()), showLastSeen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const updates = { updatedAt: Date.now() };
    if (args.fullName !== undefined) updates.fullName = normalizeFullName(args.fullName);
    if (args.nickName !== undefined) updates.nickName = normalizeNickName(args.nickName);
    if (args.bio !== undefined) {
      if ([...args.bio].length > BIO_LIMIT) throw new ConvexError("Bio must be at most 500 characters.");
      updates.bio = args.bio.trim();
    }
    if (args.showOnlineStatus !== undefined) updates.showOnlineStatus = args.showOnlineStatus;
    if (args.showLastSeen !== undefined) updates.showLastSeen = args.showLastSeen;
    await ctx.db.patch(user._id, updates);
  },
});

export const applyClerkProfile = internalMutation({
  args: { clerkId: v.string(), imageUrl: v.optional(v.string()), disabled: v.boolean(), verifiedEmail: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const user = await findUser(ctx, args.clerkId);
    if (!user || !user.isActive) return;
    const updates = {};
    if (args.disabled) Object.assign(updates, { isActive: false, isOnline: false, verifiedEmail: undefined });
    else if (args.imageUrl !== undefined && user.imageUrl !== args.imageUrl) updates.imageUrl = args.imageUrl;
    if (!args.disabled && args.verifiedEmail !== undefined && user.verifiedEmail !== (args.verifiedEmail ?? undefined))
      updates.verifiedEmail = args.verifiedEmail ?? undefined;
    if (Object.keys(updates).length) await ctx.db.patch(user._id, { ...updates, updatedAt: Date.now() });
  },
});

export const syncFromClerk = action({
  args: { fallbackImageUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) {
      // Default Clerk session tokens may omit picture. The authenticated app
      // supplies useUser().imageUrl as a display-only fallback, never an ID or
      // an account-status claim. Signed claims take precedence when present.
      const imageUrl = normalizeProfileImageUrl(identity.pictureUrl || args.fallbackImageUrl);
      if (imageUrl !== undefined) {
        await ctx.runMutation(internal.users.applyClerkProfile, {
          clerkId: identity.subject, imageUrl, disabled: false,
        });
      }
      return;
    }
    const response = await fetch("https://api.clerk.com/v1/users/" + encodeURIComponent(identity.subject), {
      headers: { Authorization: "Bearer " + secret },
    });
    if (!response.ok && response.status !== 404) throw new ConvexError("Profile synchronization failed. Please retry.");
    const data = response.status === 404 ? null : await response.json();
    await ctx.runMutation(internal.users.applyClerkProfile, {
      clerkId: identity.subject,
      imageUrl: normalizeProfileImageUrl(data?.image_url),
      verifiedEmail: primaryVerifiedEmail(data),
      disabled: !data || data.banned === true || data.locked === true,
    });
  },
});

