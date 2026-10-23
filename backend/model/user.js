import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    FullName: {
      type: String,
      required: true,
      trim: true,
    },
    // 3. Make phoneNumber optional (not required)
    password: {
      type: String,
      required: true,
    },
    // 4. Store the Google Profile Image URL
    avatar: {
      type: String,
      default: "",
    },
    Expopushtoken: {
      type: String,
      required: false, // Changed to false in case they haven't granted permission yet
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "Friendship" }], // Fixed ref to User
    block: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        enum: ["block", "unblock"],
        default: "unblock",
      },
    ],
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
userSchema.index({ FullName: "text", email: 1 });
const User = mongoose.model("User", userSchema);
export { User };
export default User;
