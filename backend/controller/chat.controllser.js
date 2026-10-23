import { Chat } from "../model/Chat.js";
import { Message } from "../model/Message.js";
import Friendship from "../model/friendregust.model.js";
import User from "../model/user.js";

export const getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    // Get all accepted friendships for this user
    const friendships = await Friendship.find({
      $or: [
        { sender: userId, status: "accepted" },
        { receiver: userId, status: "accepted" },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Extract friend IDs
    const friendIds = friendships.map((f) =>
      f.sender.toString() === userId.toString()
        ? f.receiver.toString()
        : f.sender.toString(),
    );

    // Get blocked user IDs (users I blocked + users who blocked me)
    const currentUser = await User.findById(userId).select("block");
    const myBlockedIds = (currentUser?.block || []).map((id) => id.toString());
    const blockedByOthers = await User.find({ block: userId }).select("_id");
    const othersWhoBlockedMe = blockedByOthers.map((u) => u._id.toString());
    const allBlockedIds = [
      ...new Set([...myBlockedIds, ...othersWhoBlockedMe]),
    ];

    const chats = await Chat.find({ participants: userId })
      .populate("participants", "FullName avatar")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "FullName avatar email",
        },
      })
      .sort({ lastMessageAt: -1 });

    const chatformatted = chats
      .map((chat) => {
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString(),
        );
        // Only include chats with friends who are not blocked
        if (!otherUser || !friendIds.includes(otherUser._id.toString())) {
          return null;
        }
        if (allBlockedIds.includes(otherUser._id.toString())) {
          return null;
        }
        return {
          _id: chat._id,
          participants: otherUser,
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt,
          unreadCount:
            chat.unreadCounts.find(
              (u) => u.user.toString() === userId.toString(),
            )?.count || 0,
        };
      })
      .filter(Boolean); // Remove nulls (non-friend chats)

    return res.status(200).json({ chats: chatformatted });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

// export const getorcreatedChat = async (req, res) => {
//   try {
//     const { userId } = req.params; // Target User
//     const currentUserId = req.user._id;

//     // 1. Prevent self-chat
//     if (userId === currentUserId.toString()) {
//       return res
//         .status(400)
//         .json({ message: "You cannot create a chat with yourself" });
//     }

//     // 2. Search for existing chat
//     let chat = await Chat.findOne({
//       participants: { $all: [userId, currentUserId] },
//     })
//       .populate("participants", "FullName avatar")
//       .populate("lastMessage");

//     if (chat) {
//       // 3. IMPROVEMENT: Reset unread count for the current user
//       // because they are now opening the chat.
//       await Chat.updateOne(
//         { _id: chat._id, "unreadCounts.user": currentUserId },
//         { $set: { "unreadCounts.$.count": 0 } },
//       );

//       // Update the local object so the response shows 0
//       const myCount = chat.unreadCounts.find(
//         (u) => u.user.toString() === currentUserId.toString(),
//       );
//       if (myCount) myCount.count = 0;

//       return res.status(200).json({ chat });
//     }

//     // 4. Create new chat if it doesn't exist
//     chat = await Chat.create({
//       participants: [userId, currentUserId],
//       unreadCounts: [
//         { user: userId, count: 0 },
//         { user: currentUserId, count: 0 },
//       ],
//     });

//     // Populate for a consistent frontend response
//     await chat.populate("participants", "FullName avatar");

//     return res.status(200).json({ chat });
//   } catch (error) {
//     console.error("Error in getorcreatedChat:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

export const deleteChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatIds } = req.body;

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ message: "chatIds array is required" });
    }

    // Only delete chats that the user is actually a participant in
    const chatsToDelete = await Chat.find({
      _id: { $in: chatIds },
      participants: userId,
    }).select("_id");

    if (chatsToDelete.length === 0) {
      return res.status(404).json({ message: "No matching chats found" });
    }

    const validChatIds = chatsToDelete.map((c) => c._id);

    // Delete all messages belonging to those chats
    await Message.deleteMany({ chat: { $in: validChatIds } });

    // Delete the chat documents themselves
    const result = await Chat.deleteMany({ _id: { $in: validChatIds } });

    return res.status(200).json({
      message: `${result.deletedCount} conversation(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DeleteChats Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
