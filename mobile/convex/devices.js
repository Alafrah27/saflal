// @ts-check
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { requireUser, requireIdentity, findUser } from "./auth.js";

/** @param {string} value */
function validateInstallation(value) {
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(value)) throw new ConvexError("INVALID_INSTALLATION");
}

export const registerDevice = mutation({
  args: {
    expoPushToken: v.string(), platform: v.union(v.literal("android"), v.literal("ios")),
    installationId: v.string(), language: v.union(v.literal("en"), v.literal("ar")),
  },
  returns: v.object({ deviceId: v.id("devices"), registrationVersion: v.number() }),
  handler: async (ctx, args) => {
    const caller = await requireUser(ctx);
    validateInstallation(args.installationId);
    if (!/^(ExpoPushToken|ExponentPushToken)\[[a-zA-Z0-9_-]{1,200}\]$/.test(args.expoPushToken)) {
      throw new ConvexError("INVALID_PUSH_TOKEN");
    }
    const tokenRows = await ctx.db.query("devices")
      .withIndex("by_push_token", q => q.eq("expoPushToken", args.expoPushToken)).take(2);
    const installRows = await ctx.db.query("devices")
      .withIndex("by_installation", q => q.eq("installationId", args.installationId)).take(2);
    if (tokenRows.length > 1 || installRows.length > 1) throw new ConvexError("DEVICE_DATA_CONFLICT");
    const existing = tokenRows[0] ?? installRows[0];
    const superseded = installRows[0] && installRows[0]._id !== existing?._id ? installRows[0] : null;
    const active = await ctx.db.query("devices")
      .withIndex("by_user_active", q => q.eq("userId", caller._id).eq("isActive", true)).take(21);
    if (active.filter(row => row._id !== existing?._id && row._id !== superseded?._id).length >= 20) {
      throw new ConvexError("DEVICE_LIMIT_REACHED");
    }
    const now = Date.now();
    const changed = !existing || existing.userId !== caller._id || !existing.isActive ||
      existing.expoPushToken !== args.expoPushToken || existing.installationId !== args.installationId;
    // Keep the installation's generation increasing when two historical rows
    // merge, so an older logout cannot match a reused version by accident.
    const registrationVersion = Math.max(existing?.registrationVersion ?? 0,
      superseded?.registrationVersion ?? 0) + (changed ? 1 : 0);
    const fields = { ...args, userId: caller._id, isActive: true, registrationVersion, updatedAt: now };
    if (superseded) await ctx.db.patch("devices", superseded._id, {
      installationId: undefined, isActive: false,
      registrationVersion: (superseded.registrationVersion ?? 0) + 1, updatedAt: now,
    });
    if (existing) {
      if (changed || existing.language !== args.language || existing.platform !== args.platform) {
        await ctx.db.patch("devices", existing._id, fields);
      }
      return { deviceId: existing._id, registrationVersion };
    }
    return { deviceId: await ctx.db.insert("devices", fields), registrationVersion };
  },
});

export const unregisterDevice = mutation({
  args: { installationId: v.string(), registrationVersion: v.optional(v.number()) },
  returns: v.object({ isActive: v.literal(false) }),
  handler: async (ctx, { installationId, registrationVersion }) => {
    const identity = await requireIdentity(ctx);
    const caller = await findUser(ctx, identity.subject);
    validateInstallation(installationId);
    if (registrationVersion !== undefined && (!Number.isSafeInteger(registrationVersion) || registrationVersion < 0)) {
      throw new ConvexError("INVALID_REGISTRATION_VERSION");
    }
    // Inactive/deleted profiles must still be able to sign out safely.
    if (!caller) return /** @type {const} */ ({ isActive: false });
    const rows = await ctx.db.query("devices")
      .withIndex("by_installation", q => q.eq("installationId", installationId)).take(2);
    if (rows.length > 1) throw new ConvexError("DEVICE_DATA_CONFLICT");
    const device = rows[0];
    if (device?.userId === caller._id && device.isActive &&
      (registrationVersion === undefined || registrationVersion === (device.registrationVersion ?? 0))) {
      await ctx.db.patch("devices", device._id, {
        isActive: false, registrationVersion: (device.registrationVersion ?? 0) + 1, updatedAt: Date.now(),
      });
    }
    return /** @type {const} */ ({ isActive: false });
  },
});
