import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // Store the actual content and sender to avoid extra lookups
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      messageType: {
        type: String,
      },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Track unread counts per user
    unreadCounts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

export const Chat = mongoose.model("Chat", ChatSchema);
