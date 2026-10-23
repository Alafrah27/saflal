import { Message } from "../model/Message.js";
import { Chat } from "../model/Chat.js";
import { Expo } from "expo-server-sdk";
import mongoose from "mongoose";
import User from "../model/user.js";
import { canCommunicate, directPeer, validId } from "../lib/chatAuthorization.js";

const expo = new Expo();

export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params; // Can be a Room ID or a User ID (for new chats)
    const { text } = req.body;
    const userId = req.user._id;

    // Safety check for empty text
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const { io, onlineUsers, activeChatRooms } = req;

    if (!validId(chatId)) return res.status(400).json({ message: "Invalid conversation" });
    // Resolve IDs without creating records. Existing chat IDs never fall back
    // to another conversation when the caller is not a direct participant.
    let chat = await Chat.findById(chatId);
    const peerId = chat ? directPeer(chat, userId) : chatId;
    if (!peerId || !await User.exists({ _id: peerId }) || !await canCommunicate(userId, peerId)) {
      return res.status(403).json({ message: "Conversation unavailable. An accepted friendship is required." });
    }
    if (!chat) {
      chat = await Chat.findOne({ participants: { $all: [userId, peerId], $size: 2 } });
      if (chat && !directPeer(chat, userId)) return res.status(403).json({ message: "Conversation unavailable" });
      if (!chat) {
        chat = new Chat({
          participants: [userId, peerId],
          unreadCounts: [{ user: userId, count: 0 }, { user: peerId, count: 0 }],
        });
        await chat.save();
      }
    }

    const actualChatId = chat._id;

    // 2. SAVE THE MESSAGE
    const newMessage = new Message({
      chat: actualChatId,
      sender: userId,
      text: text.trim(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Optional: 30-day expiry
    });

    await newMessage.save();
    const populatedMessage = await newMessage.populate(
      "sender",
      "FullName avatar",
    );

    // 3. UPDATE CHAT METADATA (Last message preview and unread count)
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: actualChatId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessage: {
            text: text.trim(),
            sender: userId,
            messageType: "text",
          },
        },
        $inc: { "unreadCounts.$[elem].count": 1 },
      },
      {
        arrayFilters: [{ "elem.user": { $ne: userId } }],
        new: true,
      },
    ).populate("participants", "FullName avatar Expopushtoken friends block");

    // 4. REAL-TIME EMIT TO ROOM
    io.to(`chat:${actualChatId}`).emit("receive-message", populatedMessage);

    // 5. SMART NOTIFICATIONS LOGIC
    updatedChat.participants.forEach(async (participant) => {
      const pId = participant._id.toString();
      if (pId === userId.toString()) return; // Don't notify the sender

      const recipientSocketId = onlineUsers?.get(pId);
      const currentViewingChat = recipientSocketId
        ? activeChatRooms?.get(recipientSocketId)
        : null;

      // Only notify if the recipient is NOT currently in this specific chat room
      if (currentViewingChat !== actualChatId.toString()) {
        // A. In-App Notification
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("push-notification", {
            title: populatedMessage.sender.FullName,
            body: text.trim(),
            chatId: actualChatId,
            avatar: populatedMessage.sender.avatar,
          });
        }

        // B. Expo Push Notification
        if (
          participant.Expopushtoken &&
          Expo.isExpoPushToken(participant.Expopushtoken)
        ) {
          try {
            await expo.sendPushNotificationsAsync([
              {
                to: participant.Expopushtoken,
                sound: "default",
                title: populatedMessage.sender.FullName,
                body: text.trim(),
                data: { chatId: actualChatId, type: "message" },
                priority: "high",
                channelId: "default",
              },
            ]);
          } catch (e) {
            console.error("Expo Notification Error:", e);
          }
        }
      }

      // 6. UPDATE RECIPIENT'S CHAT LIST PREVIEW
      const unreadCount =
        updatedChat.unreadCounts.find((u) => u.user.toString() === pId)
          ?.count || 0;
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("update-chat-list", {
          chatId: actualChatId,
          lastMessage: {
            text: text.trim(),
            sender: populatedMessage.sender,
            createdAt: populatedMessage.createdAt,
          },
          unreadCount,
        });
      }
    });

    // 7. RETURN SUCCESS
    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Critical error in sendMessage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // 1. Find the Chat first
    let chat = await Chat.findOne({
      _id: mongoose.isValidObjectId(chatId) ? chatId : null,
      participants: userId,
    });

    if (!chat) {
      chat = await Chat.findOne({ participants: { $all: [userId, chatId] } });
    }

    if (!chat) return res.status(200).json({ success: true, messages: [] });

    // 2. Fetch Messages — user is already verified as a participant above
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const messages = await Message.find({ chat: chat._id })
      .populate("sender", "FullName avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    // update unread count to 0
    await Chat.findOneAndUpdate(
      { _id: chat._id },
      { $set: { "unreadCounts.$[elem].count": 0 } },
      { arrayFilters: [{ "elem.user": userId }] },
    );

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("GetMessages Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: "messageIds array is required" });
    }

    // Only delete messages that the user actually sent
    const messagesToDelete = await Message.find({
      _id: { $in: messageIds },
      sender: userId,
    }).select("_id chat");

    if (messagesToDelete.length === 0) {
      return res.status(404).json({ message: "No matching messages found" });
    }

    const validMessageIds = messagesToDelete.map((m) => m._id);

    // Get unique chat IDs affected
    const affectedChatIds = [
      ...new Set(messagesToDelete.map((m) => m.chat.toString())),
    ];

    // Delete the messages
    const result = await Message.deleteMany({ _id: { $in: validMessageIds } });

    // Update lastMessage for each affected chat
    for (const chatId of affectedChatIds) {
      const latestMessage = await Message.findOne({ chat: chatId })
        .sort({ createdAt: -1 })
        .populate("sender", "FullName avatar");

      if (latestMessage) {
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: {
            text: latestMessage.text,
            sender: latestMessage.sender._id,
            messageType: "text",
          },
          lastMessageAt: latestMessage.createdAt,
        });
      } else {
        // No messages left — clear lastMessage
        await Chat.findByIdAndUpdate(chatId, {
          $unset: { lastMessage: 1 },
          lastMessageAt: null,
        });
      }
    }

    return res.status(200).json({
      message: `${result.deletedCount} message(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DeleteMessages Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
