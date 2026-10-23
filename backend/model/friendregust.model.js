import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// This index ensures a user can't send two requests to the same person
friendshipSchema.index({ sender: 1, receiver: 1 }, { unique: true });

const Friendship = mongoose.model("Friendship", friendshipSchema);
export default Friendship;
