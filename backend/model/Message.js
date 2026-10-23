import mongoose from "mongoose";
import { deleteFromCloudinary } from "../lib/cloudinary.js";

const MessageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    // Changed to an object to store both the URL and the Cloudinary ID
   
    expireAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL Index: Mongoose deletes the DOCUMENT from MongoDB
MessageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });


export const Message = mongoose.model("Message", MessageSchema);
