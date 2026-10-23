import jwt from "jsonwebtoken";
import { User } from "../model/user.js";
import cloudinary from "../lib/cloudinary.js";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const Register = async (req, res) => {
  try {
    const { FullName, email, password, Expopushtoken } = req.body;
    if (!FullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: " Password  must be at least 6 characters",
      });
    }

    if (FullName.length < 6) {
      return res.status(400).json({
        message: " FullName  must be at least 3 characters",
      });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // 4. Generate UUID
    const randomUuid = Math.random().toString(36).substring(2, 15);
    const customUuid = `UserID-${randomUuid}`;
    const user = new User({
      uuid: customUuid,
      FullName,
      email,
      password: hashedPassword,
      Expopushtoken,
      avatar: "",
      lastLogin: new Date(),
    });

    if (!user) {
      return res.status(400).json({ message: "fail while creating user" });
    }
    await user.save();
    const token = generateToken(user._id);
    return res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        FullName: user.FullName,
        avatar: user.avatar,
      },
      token,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      user: {
        _id: user._id,
        email: user.email,
        FullName: user.FullName,
        avatar: user.avatar,
      },
      token,
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id; // Get the user ID from the authenticated user
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { FullName, avatar, email, password } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};

    // 1. Basic Fields
    if (FullName) updates.FullName = FullName;
    if (email) updates.email = email;

    // 2. Password Hashing
    if (password) {
      const salt = await bcryptjs.genSalt(10);
      updates.password = await bcryptjs.hash(password, salt);
    }

    // 3. IMAGE LOGIC (Only run if a NEW avatar is provided)
    if (avatar) {
      try {
        // A. Delete the OLD image only if it exists and we are uploading a NEW one
        if (user.avatar && user.avatar.includes("cloudinary")) {
          const publicId = user.avatar.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`avatars/${publicId}`);
        }

        // B. Upload the NEW image (expects Base64 string from React Native)
        const uploadResponse = await cloudinary.uploader.upload(avatar, {
          folder: "avatars",
        });
        updates.avatar = uploadResponse.secure_url;
      } catch (cloudinaryErr) {
        console.error("Cloudinary Error:", cloudinaryErr);
        return res.status(500).json({ message: "Cloudinary upload failed" });
      }
    }

    // 4. Update the Database
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    // console.log(`✅ Profile updated: ${updatedUser.FullName}`);
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find the user first to get their avatar info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Delete Avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.includes("cloudinary")) {
      try {
        // Extract public_id from the URL (e.g., 'avatars/filename')
        const publicId = user.avatar.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      } catch (cloudinaryErr) {
        console.error("Cloudinary Delete Error:", cloudinaryErr);
        // We don't stop the process if image deletion fails, just log it
      }
    }

    // 3. Remove this user from everyone else's friends and block lists
    await User.updateMany(
      { $or: [{ friends: userId }, { block: userId }] },
      { $pull: { friends: userId, block: userId } },
    );

    // 4. Delete the User document
    await User.findByIdAndDelete(userId);
    // console.log(`🗑️ Account deleted: ${user.FullName} (${userId})`);

    return res.status(200).json({
      message: "Account and associated data deleted successfully",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const savePushToken = async (req, res) => {
  const { token } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    Expopushtoken: token,
  });

  res.json({ success: true });
};

export const getMyBlockContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .select("block")
      .populate("block", "FullName avatar");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


