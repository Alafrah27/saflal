import mongoose from "mongoose";
import Friendship from "../model/friendregust.model.js";
import { User } from "../model/user.js";

export const validId = value => mongoose.isObjectIdOrHexString(value);

// Fail closed on malformed/group/self chats; Saflal supports direct chats only.
export function directPeer(chat, userId) {
  const members = chat?.participants?.map(id => String(id).toLowerCase());
  const caller = String(userId).toLowerCase();
  if (!members || members.length !== 2 || members[0] === members[1] || !members.includes(caller)) return null;
  return members.find(id => id !== caller);
}

export async function hasBlock(userId, peerId) {
  return !!await User.exists({ $or: [
    { _id: userId, block: peerId }, { _id: peerId, block: userId },
  ] });
}

export async function canCommunicate(userId, peerId) {
  if (!validId(peerId) || String(userId).toLowerCase() === String(peerId).toLowerCase()) return false;
  const friendship = await Friendship.exists({ status: "accepted", $or: [
    { sender: userId, receiver: peerId }, { sender: peerId, receiver: userId },
  ] });
  return !!friendship && !await hasBlock(userId, peerId);
}
