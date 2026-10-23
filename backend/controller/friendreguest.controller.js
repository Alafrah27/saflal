import Friendship from "../model/friendregust.model.js";
import { User } from "../model/user.js";
import { io } from "../lib/SocketIo.js";
import { hasBlock, validId } from "../lib/chatAuthorization.js";
import { Expo } from "expo-server-sdk";

const expo = new Expo();
const unavailable = res => res.status(404).json({ message: "Request unavailable" });

async function notify(token, content) {
  if (!Expo.isExpoPushToken(token)) return;
  try {
    await expo.sendPushNotificationsAsync([{ to: token, sound: "default", priority: "high", channelId: "default", ...content }]);
  } catch {
    // A transport failure must not make a committed request look unsuccessful.
    console.warn("Friend-request push delivery failed");
  }
}

export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;
    if (!validId(receiverId)) return res.status(400).json({ message: "Invalid user" });
    if (String(senderId).toLowerCase() === String(receiverId).toLowerCase()) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver || await hasBlock(senderId, receiverId)) {
      return res.status(404).json({ message: "User unavailable" });
    }
    const existing = await Friendship.findOne({ $or: [
      { sender: senderId, receiver: receiverId }, { sender: receiverId, receiver: senderId },
    ] });
    // A reverse pending request is never treated as consent.
    if (existing) return res.status(409).json({ message: "Friend request already sent or accepted." });
    const request = await Friendship.create({ sender: senderId, receiver: receiverId });
    const populated = await request.populate("sender", "FullName avatar");
    io.to(String(receiverId)).emit("newFriendRequest", populated);
    await notify(receiver.Expopushtoken, {
      title: "Friend Request", body: req.user.FullName + " sent you a friend request", data: { senderId },
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(error?.code === 11000 ? 409 : 500).json({ message: "Request could not be sent" });
  }
};

// Friendship documents are the authorization source. The user.friends arrays
// are legacy display caches; addToSet repairs a partially failed cache update
// on a same-decision retry without granting a new friendship or notifying twice.
async function syncFriendCaches(request) {
  await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });
  await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
}

export const acceptFriendRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const userId = req.user._id;
    if (!validId(requestId)) return unavailable(res);
    const request = await Friendship.findOne({ _id: requestId, receiver: userId });
    if (!request) return unavailable(res);
    if (request.status === "accepted") {
      await syncFriendCaches(request);
      return res.json({ success: true });
    }
    if (request.status !== "pending") return res.status(409).json({ message: "Request is no longer pending" });
    const sender = await User.findById(request.sender);
    if (!sender || String(request.sender) === String(userId) || await hasBlock(userId, request.sender)) return unavailable(res);
    // Only one concurrent accept/decline may win this state transition.
    const accepted = await Friendship.findOneAndUpdate(
      { _id: requestId, receiver: userId, status: "pending" },
      { $set: { status: "accepted" } }, { new: true },
    );
    if (!accepted) {
      const current = await Friendship.findOne({ _id: requestId, receiver: userId });
      if (current?.status !== "accepted") return res.status(409).json({ message: "Request is no longer pending" });
      await syncFriendCaches(current);
      return res.json({ success: true });
    }
    await syncFriendCaches(accepted);
    io.to(String(request.sender)).emit("friendRequestAccepted", { userId });
    await notify(sender.Expopushtoken, {
      title: "Friend Request Accepted", body: req.user.FullName + " accepted your friend request.", data: { userId },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Request could not be accepted. Please try again." });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const userId = req.user._id;
    if (!validId(requestId)) return unavailable(res);
    const rejected = await Friendship.findOneAndUpdate(
      { _id: requestId, receiver: userId, status: "pending" },
      { $set: { status: "rejected" } }, { new: true },
    );
    if (!rejected) {
      const current = await Friendship.findOne({ _id: requestId, receiver: userId });
      if (!current) return unavailable(res);
      if (current.status !== "rejected") return res.status(409).json({ message: "Request is no longer pending" });
    }
    // No notification and no deletion of requests, friendships, or chat history.
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Request could not be declined. Please try again." });
  }
};

export const unfollowFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: friendId } = req.params;

    // Remove from both users
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId },
    });

    // Delete friendship record
    await Friendship.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
    });

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllMyFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find requests where I am the receiver AND status is pending
    const friendRequests = await Friendship.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "FullName avatar email") // Get sender details
      .sort({ createdAt: -1 }); // Show newest requests first

    // 2. Return the count and the data
    return res.status(200).json({
      success: true,
      count: friendRequests.length,
      requests: friendRequests,
    });
  } catch (error) {
    console.error("Fetch Requests Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
