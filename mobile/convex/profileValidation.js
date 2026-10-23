import { ConvexError } from "convex/values";
import { NICKNAME_LIMIT } from "../shared/displayName.js";

export function normalizeNickName(value) {
  const name = value.trim();
  if ([...name].length > NICKNAME_LIMIT || /[\u0000-\u001f\u007f]/u.test(name)) throw new ConvexError("INVALID_NICKNAME");
  return name || undefined;
}

export function normalizeFullName(value) {
  const fullName = value.trim();
  const length = [...fullName].length;
  if (length < 2 || length > 80) throw new ConvexError("Full name must be 2?80 characters.");
  return fullName;
}

// Display metadata only: never use an image URL as proof of identity and never
// fetch a caller-supplied URL from the server.
export function normalizeProfileImageUrl(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 2048 || /\s/.test(value)) {
    throw new ConvexError("INVALID_PROFILE_IMAGE");
  }
  let url;
  try { url = new URL(value); } catch { throw new ConvexError("INVALID_PROFILE_IMAGE"); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new ConvexError("INVALID_PROFILE_IMAGE");
  }
  return value;
}
