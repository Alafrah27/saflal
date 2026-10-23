import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  title: {
    type: String,
    default: "Notification",
  },

  body: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["message", "system", "requestFriend"],
    required: true,
  },

  data: {
    chatId: String,
    screen: String,
  },

  isRead: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Notification", notificationSchema);
