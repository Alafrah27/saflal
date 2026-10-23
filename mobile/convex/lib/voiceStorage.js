// @ts-check
/**
 * @param {import("../_generated/server.js").MutationCtx} ctx
 * @param {import("../_generated/dataModel.js").Id<"_storage"> | undefined} storageId
 */
export async function deleteUnreferencedAudio(ctx, storageId) {
  if (!storageId) return;
  const message = await ctx.db.query("messages").withIndex("by_audio_storage", q => q.eq("audioStorageId", storageId)).first();
  if (!message && await ctx.db.system.get("_storage", storageId)) await ctx.storage.delete(storageId);
}
